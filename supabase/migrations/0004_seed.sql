-- Demo seed: one active tenant per vertical, each with a staff member,
-- services, and Mon–Fri 09:00–17:00 availability. Idempotent by slug.

do $$
declare
  v_tenant uuid;
  v_staff uuid;
  v_service uuid;
  v_day int;
  rec record;
begin
  for rec in
    select * from (values
      ('demo-barbershop', 'Sharp Cuts', 'barbershop'::vertical_id),
      ('demo-dentist',    'Bright Smile Dental', 'dentist'::vertical_id),
      ('demo-tutor',      'Ace Tutoring', 'tutor'::vertical_id),
      ('demo-therapist',  'Calm Mind Therapy', 'therapist'::vertical_id),
      ('demo-mechanic',   'Reliable Auto', 'mechanic'::vertical_id)
    ) as t(slug, name, vertical)
  loop
    if exists (select 1 from tenants where slug = rec.slug) then
      continue;
    end if;

    insert into tenants (slug, name, vertical, timezone)
    values (rec.slug, rec.name, rec.vertical, 'Europe/Istanbul')
    returning id into v_tenant;

    insert into staff (tenant_id, display_name, bio, color)
    values (v_tenant, 'Alex Demo', 'Demo provider', '#4f46e5')
    returning id into v_staff;

    -- Mon–Fri 09:00–17:00
    for v_day in 1..5 loop
      insert into availability_rules (tenant_id, staff_id, weekday, start_time, end_time)
      values (v_tenant, v_staff, v_day, '09:00', '17:00');
    end loop;

    -- Two generic services per demo tenant; real presets are seeded in-app.
    insert into services (tenant_id, name, duration_min, price)
    values (v_tenant, 'Standard', 30, 30)
    returning id into v_service;
    insert into staff_services (staff_id, service_id) values (v_staff, v_service);

    insert into services (tenant_id, name, duration_min, price)
    values (v_tenant, 'Extended', 60, 55)
    returning id into v_service;
    insert into staff_services (staff_id, service_id) values (v_staff, v_service);
  end loop;
end $$;
