<template>
  <div class="app">
    <header class="header">
      <h1>🏋️ 我的健身记录</h1>
      <div class="tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab', { active: currentTab === t.key }]"
          :disabled="t.disabled"
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
        <el-button class="mt-4" type="success" @click="addWorkout()">训练完成</el-button>
      </div>
      <el-table :data="today.items">
        <el-table-column prop="part" label="部位">
          <template #default="{ row }">
            <el-input v-model="row.part" />
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作">
          <template #default="{ row }">
            <el-input v-model="row.action" />
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
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button text type="warning" @click="deleteAction(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button class="mt-4" style="width: 100%" type="warning " text @click="addNewAction()">新增记录</el-button>

      <header class="header">
        <h1>历史健身记录</h1>
      </header>
      <!-- ② 历史:已保存天的折叠列表 -->
      <el-table :data="savedDays" border>
        <el-table-column type="expand" prop="id">
          <template #default="props">
            <div m="4">
              <p v-for="item in props.row.items" :key="item.id" m="t-0 b-2">
                {{ item.part }} 部训练，{{ item.action }}: {{ item.weight }}kg x {{ item.reps }} 次 x {{ item.group }} 组
              </p>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="时间"></el-table-column>
        <el-table-column prop="total" label="总容量"></el-table-column>
      </el-table>
      <h5>目前已坚持锻炼{{ savedDays.length }}次！</h5>
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
  { key: 'record', label: '记录', disabled: false },
  { key: 'chart', label: '图表', disabled: false},
  { key: 'calendar', label: '日历', disabled: false}
]
// const currentTab = ref('record')
const currentTab = ref('chart')
// const currentTab = ref('calendar')
const currentWeight= ref(0)

// 数据结构:按天分组
const workoutList = ref(JSON.parse(localStorage.getItem('workoutList')) || [
  {
    "id": "2026-10-18 14:26",
    "date": "2026-10-18 14:26",
    "total": 5900,
    "items": [
      {
        "id": "1792333611936",
        "part": "胸",
        "action": "卧推",
        "weight": "40",
        "group": "4",
        "reps": "12"
      },
      {
        "id": "1792333632335",
        "part": "胸",
        "action": "蝴蝶机夹胸",
        "weight": "40",
        "group": "4",
        "reps": "12"
      },
      {
        "id": "1792333661230",
        "part": "胸",
        "action": "悍马机推胸",
        "weight": "45",
        "group": "4",
        "reps": "8"
      },
      {
        "id": "1792333680648",
        "part": "肱三头",
        "action": "绳索下压",
        "weight": "15.5",
        "group": "4",
        "reps": "10"
      }
    ]
  },
  {
    "id": "2026-10-18 14:19",
    "date": "2026-10-18 14:19",
    "total": 4480,
    "items": [
      {
        "id": "1792333195826",
        "part": "背",
        "action": "引体",
        "weight": "40",
        "group": "5",
        "reps": "8"
      },
      {
        "id": "1792333208673",
        "part": "背",
        "action": "下拉",
        "weight": "30",
        "group": "4",
        "reps": "12"
      },
      {
        "id": "1792333228217",
        "part": "背",
        "action": "剪刀单臂下拉",
        "weight": "30",
        "group": "4",
        "reps": "12"
      }
    ]
  }
])

// 默认今天这组:当天日期 key,未保存
const today = ref({
  id: todayDate(),          // 见下方函数
  date: todayDate(),
  total: 0,
  items: []
})

// 今天的日期字符串,如 '2026-09-25'
function todayDate() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ')
}

// 取所有已保存的天(按日期倒序,最近在上)
const savedDays = computed(() =>
  workoutList.value.sort((a,b) => b.date.localeCompare(a.date))
)

function dayTotalVolume(day) {
  let total = 0
  day.items.forEach(item => {
    total += item.weight * item.group * item.reps
  })
  today.value.total = total
  return total
}


// 初始化today
function initToday() {
  today.value = {
    id: todayDate(),
    date: todayDate(),
    saved: false,
    total: 0,
    items: []
  }
}

// ---- 增删 ----
// 新增action
function addNewAction() {
  today.value.items.push({
    id: Date.now().toString(),
    part:'',
    action: '',
    weight: 0,
    group: 0,
    reps: 0
  })
}

function deleteAction(row) {
  today.value.items = today.value.items.filter(w => w.id !== row.id)
}

function deleteWorkout(row) {
  workoutList.value = workoutList.value.filter(w => w.id !== row.id)
}

//保存today
function addWorkout(){
  console.log(workoutList)
  workoutList.value.push(today.value)
  initToday()
}


// ---- 图表 ----
const lineRef = ref(null)
const pieRef = ref(null)

function partTrendData() {
  // 按部位×天聚合:遍历每天里的每一条记录
  const map = {} // part -> { 日期: 总组数 }
  workoutList.value.forEach(day => {
    ;(day.items || []).forEach(item => {
      if (!item.part) return
      if (!map[item.part]) map[item.part] = {}
      const d = day.date
      const vol = (Number(item.weight) || 0) * (Number(item.group) || 0) * (Number(item.reps) || 0)
      map[item.part][d] = (map[item.part][d] || 0) + vol
    })
  })
  const dates = [...new Set(workoutList.value.map(day => day.date))].sort()
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
  workoutList.value.forEach(day => {
    ;(day.items || []).forEach(item => {
      if (!item.part) return
      map[item.part] = (map[item.part] || 0) + 1
    })
  })
  return Object.keys(map).map(part => ({ name: part, value: map[part] }))
}

function renderCharts() {
  if (!lineRef.value || !pieRef.value) return
  const { dates, series } = partTrendData()
  echarts.init(lineRef.value).setOption({
    title: { text: '各部位训练量趋势(总容量)' },
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
  const prefix = dayStr.slice(0, 10)          // '2026-10-21'
  return workoutList.value.some(w => (w.date || '').slice(0, 10) === prefix)
}

// 初始进来时，如果当前就在图表页，先渲染一次
onMounted(async () => {
  if (currentTab.value === 'chart') {
    await nextTick()
    renderCharts()
  }
})

watch(workoutList, (val) => {
  localStorage.setItem('workoutList', JSON.stringify(val))
}, { deep: true })

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