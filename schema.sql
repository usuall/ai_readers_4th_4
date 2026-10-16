-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run

create table rentals (
  id          bigint generated always as identity primary key,
  item_name   text not null check (btrim(item_name) <> ''),
  borrower    text not null check (btrim(borrower) <> ''),
  rented_at   date not null default current_date,
  due_at      date,            -- 반납 예정일 (선택)
  returned_at date             -- null = 대여 중
);

alter table rentals enable row level security;

-- 로그인 없는 부서 내부용: 누구나 조회/등록, 반납 처리만 가능 (삭제 불가)
create policy "read"   on rentals for select to anon using (true);
create policy "insert" on rentals for insert to anon with check (returned_at is null);
create policy "return" on rentals for update to anon
  using (returned_at is null)            -- 대여 중인 행만
  with check (returned_at is not null);  -- 반납일을 채우는 방향으로만

-- 반납 시 returned_at 외 다른 칸은 못 바꾸게 컬럼 권한 제한
revoke update on rentals from anon, authenticated;
grant update (returned_at) on rentals to anon;
