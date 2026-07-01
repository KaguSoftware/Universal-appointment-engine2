-- Payment recording RPCs. Writes to payments + appointment payment state go
-- through SECURITY DEFINER functions so app code never needs the service-role
-- client. Amounts are computed in the app (DepositCalculator) and recorded here.

-- Record a captured payment for an appointment and advance its payment_status.
create or replace function record_appointment_payment(
  p_appointment uuid,
  p_amount numeric,
  p_kind payment_kind,
  p_iyzico_ref text,
  p_status text default 'succeeded'
)
returns payments
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
  v_row payments;
begin
  select * into v_appt from appointments where id = p_appointment;
  if v_appt.id is null then
    raise exception 'NOT_FOUND';
  end if;
  -- Only tenant members may record payments (admin/staff acting in-app).
  if not is_member_of(v_appt.tenant_id) then
    raise exception 'FORBIDDEN';
  end if;

  insert into payments (tenant_id, appointment_id, amount, currency, kind,
                        iyzico_ref, status)
  values (v_appt.tenant_id, p_appointment, p_amount,
          coalesce((select currency from services where id = v_appt.service_id), 'USD'),
          p_kind, p_iyzico_ref, p_status)
  returning * into v_row;

  if p_status = 'succeeded' then
    update appointments set
      payment_status = case
        when p_kind = 'refund' then 'refunded'
        when p_kind = 'full' then 'paid'
        when p_kind = 'deposit' then 'deposit_paid'
        else payment_status
      end,
      iyzico_payment_ref = coalesce(p_iyzico_ref, iyzico_payment_ref)
    where id = p_appointment;

    -- Track lifetime spend on the linked customer record.
    if v_appt.customer_record_id is not null and p_kind <> 'refund' then
      update customers set total_spend = total_spend + p_amount
      where id = v_appt.customer_record_id;
    end if;
  end if;

  return v_row;
end;
$$;

-- Mark an appointment no-show, record the no-show fee, and bump the customer's
-- no-show counter. Amount is computed by the app from the deposit policy.
create or replace function charge_no_show(
  p_appointment uuid,
  p_fee numeric,
  p_iyzico_ref text default null
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_appt appointments;
begin
  select * into v_appt from appointments where id = p_appointment;
  if v_appt.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if not is_member_of(v_appt.tenant_id) then
    raise exception 'FORBIDDEN';
  end if;

  update appointments set status = 'no_show' where id = p_appointment
  returning * into v_appt;

  if v_appt.customer_record_id is not null then
    update customers set total_no_shows = total_no_shows + 1
    where id = v_appt.customer_record_id;
  end if;

  if p_fee > 0 then
    insert into payments (tenant_id, appointment_id, amount, currency, kind,
                          iyzico_ref, status)
    values (v_appt.tenant_id, p_appointment, p_fee,
            coalesce((select currency from services where id = v_appt.service_id), 'USD'),
            'no_show_fee', p_iyzico_ref, 'succeeded');
  end if;

  return v_appt;
end;
$$;

grant execute on function record_appointment_payment(uuid, numeric, payment_kind, text, text)
  to authenticated;
grant execute on function charge_no_show(uuid, numeric, text) to authenticated;
