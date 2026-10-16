import { createClient } from '@supabase/supabase-js'

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key } = import.meta.env
if (!url || !key) {
  document.body.textContent = '환경변수 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 를 설정하세요 (.env 또는 Vercel 프로젝트 설정).'
  throw new Error('Supabase env missing')
}
const db = createClient(url, key)

const $ = (s) => document.querySelector(s)
const today = () => new Date().toLocaleDateString('sv-SE') // 로컬 시간 기준 YYYY-MM-DD

let tab = 'active' // 'active' | 'returned'
let item = null    // 물품별 이력 보기 중인 물품명

async function load() {
  let q = db.from('rentals').select('*').order('rented_at', { ascending: false }).order('id', { ascending: false })
  if (item) q = q.eq('item_name', item)
  else if (tab === 'active') q = q.is('returned_at', null)
  else q = q.not('returned_at', 'is', null)
  const { data, error } = await q
  if (error) return alert(error.message)

  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', !item && b.dataset.tab === tab))
  $('#history').hidden = !item
  $('#history strong').textContent = `'${item}' 대여 이력`

  const tbody = $('#rows')
  tbody.replaceChildren()
  for (const r of data) {
    const tr = tbody.insertRow()
    if (!r.returned_at && r.due_at && r.due_at < today()) tr.className = 'overdue'

    const name = document.createElement('button')
    name.className = 'link'
    name.textContent = r.item_name
    name.onclick = () => { item = r.item_name; load() }
    tr.insertCell().append(name)

    for (const v of [r.borrower, r.rented_at, r.due_at ?? '-', r.returned_at ? `반납 완료 (${r.returned_at})` : '대여 중']) {
      tr.insertCell().textContent = v
    }

    const act = tr.insertCell()
    if (!r.returned_at) {
      const btn = document.createElement('button')
      btn.textContent = '반납'
      btn.onclick = () => giveBack(r)
      act.append(btn)
    }
  }
  if (!data.length) {
    const td = tbody.insertRow().insertCell()
    td.colSpan = 6
    td.textContent = '기록이 없습니다.'
  }
}

async function giveBack(r) {
  if (!confirm(`${r.item_name} (${r.borrower}) 반납 처리할까요?`)) return
  const { error } = await db.from('rentals').update({ returned_at: today() }).eq('id', r.id)
  error ? alert(error.message) : load()
}

$('#form').onsubmit = async (e) => {
  e.preventDefault()
  const f = Object.fromEntries(new FormData(e.target))
  f.due_at ||= null // 빈 문자열은 date 컬럼에 못 들어감
  const { error } = await db.from('rentals').insert(f)
  if (error) return alert(error.message)
  e.target.reset()
  e.target.rented_at.value = today()
  item = null
  tab = 'active'
  load()
}

document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; item = null; load() }))
$('#close').onclick = () => { item = null; load() }

$('#form').rented_at.value = today()
load()
