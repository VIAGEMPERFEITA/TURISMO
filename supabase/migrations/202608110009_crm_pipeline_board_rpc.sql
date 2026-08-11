create or replace function public.crm_pipeline_board()
returns table (
  id uuid,
  name text,
  code text,
  stage_position integer,
  color text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ps.id,
    ps.name,
    ps.code,
    ps.position as stage_position,
    ps.color
  from public.pipeline_stages ps
  join public.pipelines p on p.id = ps.pipeline_id
  where auth.uid() is not null
    and p.organization_id = public.current_organization_id()
    and p.is_default = true
    and p.active = true
    and ps.active = true
  order by ps.position;
$$;

revoke all on function public.crm_pipeline_board() from public;
revoke all on function public.crm_pipeline_board() from anon;
grant execute on function public.crm_pipeline_board() to authenticated;

comment on function public.crm_pipeline_board() is
  'Returns the active default CRM pipeline for the authenticated user organization.';
