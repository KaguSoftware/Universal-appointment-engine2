-- Availability data that can exclude a specific appointment (used when
-- rescheduling so the appointment's own slot is treated as free).

create or replace function public_availability_data_excluding(
  p_staff uuid, p_from date, p_to date, p_exclude uuid
)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(to_jsonb(r)) from availability_rules r
      where r.staff_id = p_staff), '[]'::jsonb),
    'overrides', coalesce((
      select jsonb_agg(to_jsonb(o)) from availability_overrides o
      where o.staff_id = p_staff and o.date between p_from and p_to), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'start_at', a.start_at, 'end_at', a.end_at))
      from appointments a
      where a.staff_id = p_staff
        and a.id <> p_exclude
        and a.status in ('booked', 'completed')
        and a.start_at < (p_to + 1)::timestamptz
        and a.end_at   > p_from::timestamptz), '[]'::jsonb)
  );
$$;

grant execute on function public_availability_data_excluding(uuid, date, date, uuid)
  to anon, authenticated;
