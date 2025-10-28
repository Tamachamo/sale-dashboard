import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { submitSale, fetchStats, fetchRows } from './api'
import Card from './components/Card'
import Header from './components/Header'
import Footer from './components/Footer'
import ChartBar from './components/ChartBar'
import { yen } from './utils/format'
import { SIZE_MAP } from './utils/constants'
import './index.css'

export default function App() {
  const [storeFilter, setStoreFilter] = useState('ALL')
  const [startMonth, setStartMonth] = useState(dayjs().startOf('year').format('YYYY-MM'))
  const [endMonth, setEndMonth] = useState(dayjs().format('YYYY-MM'))

  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ totals:{}, breakdown:{} })
  const [stores, setStores] = useState([])

  const [form, setForm] = useState({
    chip_type: 'ショートオーバル',
    size_cls: '',
    size_digits: '',
    price_total: '',
    store: '',
    month: ''
  })

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadStats() }, [storeFilter, startMonth, endMonth])

  async function loadData() {
    const r = await fetchRows(2000)
    const data = r.rows || []
    setRows(data)
    const uniqueStores = Array.from(new Set(data.map(d => d.store).filter(Boolean)))
    setStores(uniqueStores)
  }

  async function loadStats() {
    const s = await fetchStats({ store: storeFilter, start: startMonth, end: endMonth })
    setStats(s)
  }

  useEffect(() => {
    if (form.size_cls && SIZE_MAP[form.size_cls]) {
      setForm(prev => ({ ...prev, size_digits: SIZE_MAP[prev.size_cls] }))
    }
  }, [form.size_cls])

  async function onSubmit(e) {
    e.preventDefault()
    const payload = {
      chip_type: form.chip_type,
      size_cls: form.size_cls,
      size_digits: form.size_digits,
      price_total: Number(form.price_total),
      store: form.store,
      month: form.month
    }
    const res = await submitSale(payload)
    if (res.ok) {
      setForm(prev => ({ ...prev, price_total:'', size_digits: prev.size_cls ? SIZE_MAP[prev.size_cls] : '' }))
      await loadData()
      await loadStats()
      alert('登録しました')
    } else {
      alert('登録に失敗: ' + (res.error || 'unknown'))
    }
  }

  const countByTypeData = useMemo(() => {
    if (!rows.length) return []
    const filtered = rows.filter(r => {
      const inStore = storeFilter === 'ALL' || r.store === storeFilter
      const m = r.month
      const inPeriod = (!startMonth || m >= startMonth) && (!endMonth || m <= endMonth)
      return inStore && inPeriod
    })
    const map = {}
    filtered.forEach(r => {
      const k = r.chip_type || '未指定'
      map[k] = (map[k] || 0) + 1
    })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [rows, storeFilter, startMonth, endMonth])

  const revenueCards = useMemo(() => {
    const rev = stats?.breakdown?.revenueByStore || {}
    const entries = Object.entries(rev)
    if (!entries.length && storeFilter !== 'ALL') {
      return [[storeFilter, stats?.totals?.totalRevenue || 0]]
    }
    return entries
  }, [stats, storeFilter])

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <Card title="データ登録">
          <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">チップ種類</label>
              <select
                className="w-full rounded-xl border p-2"
                value={form.chip_type}
                onChange={e=>setForm({...form, chip_type:e.target.value})}
              >
                <option>ショートオーバル</option>
                <option>ベリーショート</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">チップサイズ S/M/L（空欄可）</label>
              <select
                className="w-full rounded-xl border p-2"
                value={form.size_cls}
                onChange={e=>setForm({...form, size_cls:e.target.value})}
              >
                <option value="">（未指定）</option>
                <option value="S">S（→26569）</option>
                <option value="M">M（→15458）</option>
                <option value="L">L（→04347）</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">チップサイズ 5桁</label>
              <input
                className="w-full rounded-xl border p-2"
                placeholder="例: 26569"
                value={form.size_digits}
                onChange={e=>setForm({...form, size_digits:e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">商品価格（税込）</label>
              <input
                type="number"
                className="w-full rounded-xl border p-2"
                placeholder="例: 3200"
                value={form.price_total}
                onChange={e=>setForm({...form, price_total:e.target.value})}
                required
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">店舗名</label>
              <input
                className="w-full rounded-xl border p-2"
                placeholder="例: Matoeru 金沢店"
                value={form.store}
                onChange={e=>setForm({...form, store:e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">売上月（任意, YYYY-MM）</label>
              <input
                className="w-full rounded-xl border p-2"
                placeholder={dayjs().format('YYYY-MM')}
                value={form.month}
                onChange={e=>setForm({...form, month:e.target.value})}
              />
            </div>

            <div className="md:col-span-3">
              <button type="submit" className="px-5 py-2 rounded-xl bg-black text-white hover:opacity-90">
                登録する
              </button>
            </div>
          </form>
        </Card>

        <Card title="フィルタ" right={<div className="text-sm text-slate-500">期間と店舗で絞込</div>}>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">店舗</label>
              <select
                className="w-full rounded-xl border p-2"
                value={storeFilter}
                onChange={e=>setStoreFilter(e.target.value)}
              >
                <option value="ALL">すべて</option>
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">開始月</label>
              <input
                className="w-full rounded-xl border p-2"
                value={startMonth}
                onChange={e=>setStartMonth(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">終了月</label>
              <input
                className="w-full rounded-xl border p-2"
                value={endMonth}
                onChange={e=>setEndMonth(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card title="総販売数">
            <div className="text-3xl font-bold">{stats?.totals?.totalCount || 0}</div>
            <div className="text-slate-500 text-sm mt-1">
              {startMonth}〜{endMonth}（{storeFilter === 'ALL' ? '全店舗' : storeFilter}）
            </div>
          </Card>
          <Card title="売上合計">
            <div className="text-3xl font-bold">{yen(stats?.totals?.totalRevenue || 0)}</div>
            <div className="text-slate-500 text-sm mt-1">税込ベース</div>
          </Card>
          <Card title="店舗別売上">
            <div className="space-y-2">
              { (Array.isArray(revenueCards) && revenueCards.length)
                ? revenueCards.map(([s, v]) => (
                    <div key={s} className="flex items-center justify-between">
                      <div className="truncate">{s}</div>
                      <div className="font-semibold">{yen(v)}</div>
                    </div>
                  ))
                : <div className="text-slate-500 text-sm">データなし</div>
              }
            </div>
          </Card>
        </div>

        <Card title="チップ種類ごとの販売数">
          <ChartBar data={countByTypeData} xKey="name" yKey="count" yName="販売数" />
        </Card>
      </main>
      <Footer />
    </div>
  )
}
