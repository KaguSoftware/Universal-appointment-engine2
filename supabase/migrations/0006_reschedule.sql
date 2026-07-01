-- Transactional reschedule: move an appointment to a new start time.
-- Honors the exclusion constraint (no overlap) and the same authorization
-- rules as cancellation (owner customer or a tenant member).

create or replace function reschedule_appointment(
  p_appointment uuid,
  p_start timestamptz
)
returns appointments
language plpgsql security definer set search_path = public as $$
declare
  v_row appointments;
  v_duration int;
begin
  select * into v_row from appointments where id = p_appointment;
  if v_row.id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not (v_row.customer_id = auth.uid() or is_member_of(v_row.tenant_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if v_row.status <> 'booked' then
    raise exception 'NOT_RESCHEDULABLE';
  end if;

  select duration_min into v_duration from services where id = v_row.service_id;

  update appointments
    set start_at = p_start,
        end_at   = p_start + make_interval(mins => v_duration)
  where id = p_appointment
  returning * into v_row;

  return v_row;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN';
end;
$$;

grant execute on function reschedule_appointment(uuid, timestamptz) to authenticated;
