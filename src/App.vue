<template>
  <div class="app">
    <header class="header">
      <h1>🏋️ 我的健身记录</h1>
      <div class="tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab', { active: currentTab === t.key }]"
          @click="currentTab = t.key"
        >{{ t.label }}</button>
      </div>
    </header>

    <!-- 记录视图 -->
    <!-- ① 今天:保存前可编辑的表格 -->
    <section v-if="currentTab === 'record'" class="panel">
      <div style="display: flex; justify-content: space-between;">
        <span>今天：{{ today.date }}</span>
        <span>总容量：{{ dayTotalVolume(today) }}</span>
      </div>
      <el-table :data="today.items">
        <el-table-column prop="part" label="部位">
          <template #default="{ row }">
            <el-input v-model="row.part" />
          </template>
        </el-table-column>
        <el-table-column prop="exercise" label="动作">
          <template #default="{ row }">
            <el-input v-model="row.exercise" />
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="重量">
          <template #default="{ row }">
            <el-input v-model="row.weight" />
          </template>
        </el-table-column>
        <el-table-column prop="reps" label="次数">
          <template #default="{ row }">
            <el-input v-model="row.reps" />
          </template>
        </el-table-column>
        <el-table-column prop="group" label="组数">
          <template #default="{ row }">
            <el-input v-model="row.group" />
          </template>
        </el-table-column>
      </el-table>

      <!-- ② 历史:已保存天的折叠列表 -->
      <el-table :data="savedDays" border>
        <el-table-column type="expand">
          <!-- <template #default="{ row }">
          </template> -->
        </el-table-column>
      </el-table>
    </section>

    <!-- 图表视图 -->
    <section v-if="currentTab === 'chart'" class="panel">
      <div ref="lineRef" class="chart"></div>
      <div ref="pieRef" class="chart"></div>
    </section>

    <!-- 日历视图 -->
    <section v-if="currentTab === 'calendar'" class="panel">
      <el-calendar v-model="selectedDate">
        <template #date-cell="{ data }">
          <div class="cal-cell" :class="{ trained: isTrained(data.day) }">
            {{ data.day.split('-')[2] }}
          </div>
        </template>
      </el-calendar>
      <p class="hint">绿点 = 当天有训练记录</p>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'

const tabs = [
  { key: 'record', label: '记录' },
  { key: 'chart', label: '图表' },
  { key: 'calendar', label: '日历' }
]
const currentTab = ref('record')
const currentWeight= ref(0)

// 数据结构:按天分组
const workoutList = ref(JSON.parse(localStorage.getItem('workoutList')) || [])

// 默认今天这组:当天日期 key,未保存
const today = ref({
  id: todayDate(),          // 见下方函数
  date: todayDate(),
  saved: false,
  total: 0,
  items: []
})

// 今天的日期字符串,如 '2026-09-25'
function todayDate() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

// 取所有已保存的天(按日期倒序,最近在上)
const savedDays = computed(() =>
  workoutList.value.filter(w => w.saved).sort((a,b) => b.date.localeCompare(a.date))
)

function dayTotalVolume(day) {
  let total = 0
  day.items.forEach(item => {
    total += item.weight * item.group * item.reps
  })
  return total
}

watch(workoutList, (val) => {
  localStorage.setItem('workoutList', JSON.stringify(val))
}, { deep: true })

// ---- 增删 ----
function addWorkout() {
}
function deleteWorkout(row) {
  workoutList.value = workoutList.value.filter(w => w.id !== row.id)
}

// ---- 图表 ----
const lineRef = ref(null)
const pieRef = ref(null)

function partTrendData() {
  // 按部位聚合:每个部位每天的总组数
  const map = {}
  workoutList.value.forEach(w => {
    if (!w.part) return
    if (!map[w.part]) map[w.part] = {}
    const d = w.date
    map[w.part][d] = (map[w.part][d] || 0) + (w.group || 0)
  })
  // 收集所有日期
  const dates = [...new Set(workoutList.value.map(w => w.date))].sort()
  const series = Object.keys(map).map(part => ({
    name: part,
    type: 'line',
    smooth: true,
    data: dates.map(d => map[part][d] || 0)
  }))
  return { dates, series }
}

function partPieData() {
  const map = {}
  workoutList.value.forEach(w => {
    if (!w.part) return
    map[w.part] = (map[w.part] || 0) + 1
  })
  return Object.keys(map).map(part => ({ name: part, value: map[part] }))
}

function renderCharts() {
  if (!lineRef.value || !pieRef.value) return
  const { dates, series } = partTrendData()
  echarts.init(lineRef.value).setOption({
    title: { text: '各部位训练量趋势(组数)' },
    tooltip: {},
    legend: {},
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series
  })
  echarts.init(pieRef.value).setOption({
    title: { text: '各部位记录占比' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '65%',
      data: partPieData()
    }]
  })
}

// ---- 日历 ----
const selectedDate = ref(new Date())
function isTrained(dayStr) {
  return workoutList.value.some(w => w.date === dayStr)
}

watch(currentTab, async (v) => {
  if (v === 'chart') {
    await nextTick()
    renderCharts()
  }
})
</script>

<style scoped>
.app { max-width: 900px; margin: 0 auto; padding: 24px; font-family: system-ui, "PingFang SC", sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.header h1 { font-size: 24px; }
.tabs { display: flex; gap: 8px; }
.tab { padding: 8px 18px; border: 1px solid #dcdfe6; border-radius: 8px; background: #fff; cursor: pointer; font-size: 15px; }
.tab.active { background: #409eff; color: #fff; border-color: #409eff; }
.toolbar { margin-bottom: 14px; }
.chart { height: 300px; margin-bottom: 24px; }
.cal-cell { text-align: center; }
.cal-cell.trained { background: #67c23a; color: #fff; border-radius: 4px; }
.hint { color: #909399; font-size: 13px; margin-top: 10px; }
</style>