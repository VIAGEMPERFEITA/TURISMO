-- Os novos valores do enum ficam em uma migration própria para garantir
-- que o PostgreSQL faça commit antes de eles serem usados por funções e políticas.
alter type public.user_role add value if not exists 'atendimento';
alter type public.user_role add value if not exists 'marketing';
alter type public.user_role add value if not exists 'financeiro';
