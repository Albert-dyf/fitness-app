<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">🏋️ 我的健身记录</h1>
      <nav class="tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab', { active: currentTab === t.key }]"
          :disabled="t.disabled"
          @click="currentTab = t.key"
        >{{ t.label }}</button>
      </nav>
      <el-button v-if="!pro" size="small" type="warning" plain @click="goPurchase">解锁 Pro</el-button>
      <span v-else class="pro-badge">PRO</span>
    </header>

    <!-- 备份提醒 -->
    <transition name="fade">
      <div v-if="needBackupTip" class="backup-tip">
        <span>⚠️ {{ backupTipText }}，记录只存在本浏览器，清缓存或换设备会丢失，建议导出一份备份。</span>
        <div class="backup-tip-btns">
          <el-button size="small" type="warning" @click="exportData">立即备份</el-button>
          <el-button size="small" text @click="hideBackupTip = true">稍后</el-button>
        </div>
      </div>
    </transition>

    <!-- 记录视图 -->
    <section v-if="currentTab === 'record'" class="panel">
      <!-- ① 今天 -->
      <div class="card">
        <div class="today-bar">
          <div class="today-meta">
            <span class="today-label">今天</span>
            <span class="today-date">{{ today.date }}</span>
            <span class="today-volume">总容量 <b>{{ dayTotalVolume(today) }}</b></span>
          </div>
          <el-button type="success" @click="addWorkout()">训练完成</el-button>
        </div>

        <el-table :data="today.items" class="app-table">
          <el-table-column prop="part" label="部位">
            <template #default="{ row }"><el-input v-model="row.part" /></template>
          </el-table-column>
          <el-table-column prop="action" label="动作">
            <template #default="{ row }"><el-input v-model="row.action" /></template>
          </el-table-column>
          <el-table-column prop="weight" label="重量">
            <template #default="{ row }"><el-input v-model="row.weight" /></template>
          </el-table-column>
          <el-table-column prop="reps" label="次数">
            <template #default="{ row }"><el-input v-model="row.reps" /></template>
          </el-table-column>
          <el-table-column prop="group" label="组数">
            <template #default="{ row }"><el-input v-model="row.group" /></template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button text type="warning" @click="deleteAction(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-button class="add-btn" type="warning" text @click="addNewAction()">＋ 新增记录</el-button>
      </div>

      <!-- ② 历史 -->
      <div class="card">
        <div class="section-head">
          <h2 class="section-title">📝 历史健身记录</h2>
          <div class="head-actions">
            <el-button @click="exportData">导出备份</el-button>
            <el-button @click="$refs.fileInput.click()">导入备份</el-button>
            <input ref="fileInput" type="file" accept=".json,application/json" style="display:none" @change="importData" />
          </div>
        </div>

        <p class="streak">🔥 目前已坚持锻炼 <b>{{ savedDays.length }}</b> 次！</p>

        <el-table :data="savedDays" border class="app-table">
          <el-table-column type="expand" prop="id">
            <template #default="props">
              <div class="expand-box">
                <div class="expand-item" v-for="item in props.row.items" :key="item.id">
                  <span class="part-tag">{{ item.part }}</span>
                  <span class="action-name">{{ item.action }}</span>
                  <span class="detail">
                    <span class="num"><b>{{ item.weight }}</b>kg</span>
                    <i>×</i>
                    <span class="num"><b>{{ item.reps }}</b>次</span>
                    <i>×</i>
                    <span class="num"><b>{{ item.group }}</b>组</span>
                  </span>
                  <span class="volume">
                    容量 {{ (Number(item.weight) || 0) * (Number(item.group) || 0) * (Number(item.reps) || 0) }}
                  </span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="date" label="时间"></el-table-column>
          <el-table-column prop="total" label="总容量"></el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button text type="warning" @click="deleteWorkout(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <!-- 图表视图 -->
     <section v-if="currentTab === 'chart'" class="panel">
      <template v-if="pro">
        <div class="card"><div ref="lineRef" class="chart"></div></div>
        <div class="card"><div ref="pieRef" class="chart"></div></div>
      </template>
      <div v-else class="card lock-card">
        <div class="lock-icon">📊</div>
        <h3>图表分析是 Pro 功能</h3>
        <p>解锁后查看各部位容量趋势、训练占比，直观看到进步曲线。</p>
        <div class="lock-btns">
          <el-button type="warning" @click="goPurchase">¥6.6 立即解锁</el-button>
          <el-button text @click="showActivate = true">我已有激活码</el-button>
        </div>
      </div>
    </section>

    <!-- 日历视图 -->
     <section v-if="currentTab === 'calendar'" class="panel">
      <template v-if="pro">
        <div class="card">
          <el-calendar v-model="selectedDate">
            <template #date-cell="{ data }">
              <div class="cal-cell" :class="{ trained: isTrained(data.day) }">
                {{ data.day.split('-')[2] }}
              </div>
            </template>
          </el-calendar>
          <p class="hint">🟢 绿点 = 当天有训练记录</p>
        </div>
      </template>
      <div v-else class="card lock-card">
        <div class="lock-icon">🗓️</div>
        <h3>训练日历是 Pro 功能</h3>
        <p>解锁后用绿点回看你的坚持轨迹，养成训练习惯。</p>
        <div class="lock-btns">
          <el-button type="warning" @click="goPurchase">¥6.6 立即解锁</el-button>
          <el-button text @click="showActivate = true">我已有激活码</el-button>
        </div>
      </div>
    </section>
    <!-- 回到顶部 -->
    <transition name="fade">
      <button v-show="showBackTop" class="back-top" @click="scrollToTop" aria-label="回到顶部">↑</button>
    </transition>
    <el-dialog v-model="showActivate" title="输入激活码" width="90%" style="max-width: 420px">
      <el-input
        v-model="inputCode"
        placeholder="粘贴激活码，形如 PL0001.xxxxx"
        @keyup.enter="activateCode"
      />
      <template #footer>
        <el-button @click="showActivate = false">取消</el-button>
        <el-button type="primary" :loading="activating" @click="activateCode">激活</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessageBox, ElMessage } from 'element-plus'
import confetti from 'canvas-confetti' // 动效库
import { verifyCode, getSavedCode, saveCode, restorePro } from './license'

const tabs = [
  { key: 'record', label: '记录', disabled: false },
  { key: 'chart', label: '图表', disabled: false},
  { key: 'calendar', label: '日历', disabled: false}
]
const currentTab = ref('record')
// const currentTab = ref('chart')
// const currentTab = ref('calendar')

// 数据结构:按天分组
const workoutList = ref(JSON.parse(localStorage.getItem('workoutList')) || [])

// 默认今天这组:当天日期 key,未保存
const today = ref({
  id: todayDate(),          // 见下方函数
  date: todayDate(),
  total: 0,
  items: []
})

// 今天的日期字符串,如 '2026-09-25 17:41'
function todayDate() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  return total
}


// 初始化today
function initToday() {
  today.value = {
    id: todayDate(),
    date: todayDate(),
    total: 0,
    items: []
  }
}

// ---- 增删 ----
// 新增action
function addNewAction() {
  const hasIncomplete = today.value.items.some(it =>
    !it.part || !it.action ||
    !(Number(it.weight) > 0) || !(Number(it.group) > 0) || !(Number(it.reps) > 0)
  )
  if (hasIncomplete) {
    ElMessage.warning('请先完善当前训练记录，再添加新的记录')
    return
  }
  today.value.items.push({
    id: Date.now().toString(),
    part:'',
    action: '',
    weight: '',
    group: '',
    reps: ''
  })
}

function deleteAction(row) {
  today.value.items = today.value.items.filter(w => w.id !== row.id)
}

async function deleteWorkout(row) {
  try {
    // 弹确认框，用户点"确定"才继续
    await ElMessageBox.confirm(
      `确定要删除 ${row.date} 这一次的训练记录吗？删除后无法恢复`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    // 用户确认了，才真正删
    workoutList.value = workoutList.value.filter(w => w.id !== row.id)
    ElMessage.success('已删除')
  } catch (e) {
    // 用户点了取消，什么都不做(confirm 取消会抛错，这里吃掉它)
  }
}

//保存today
function addWorkout(){
  // 第1层：当天有没有记录
  if (!today.value.items || today.value.items.length === 0) {
    ElMessage.warning('今天还没有任何训练记录，先添加一条再保存')
    return
  }
  // 第2层：逐条检查字段
  for (const it of today.value.items) {
    if (!it.part || !it.action) {
      ElMessage.warning('「部位」和「动作」都要填')
      return
    }
    if (!(Number(it.weight) > 0) || !(Number(it.group) > 0) || !(Number(it.reps) > 0)) {
      ElMessage.warning(`「${it.action}」的重量/组数/次数要填大于0的数字`)
      return
    }
  }
  // 第3层：深拷贝后入列，重算 total
  const toSave = {
    ...today.value,
    id: today.value.id || Date.now().toString(),
    total: dayTotalVolume(today.value),
    items: today.value.items.map(it => ({ ...it })) // 每项也拷贝，切断引用
  }
  workoutList.value.push(toSave)
  ElMessage.success('已保存')
  successAction()
  initToday()
}

// 成功动效
function successAction() {
  confetti({
    particleCount: 120,      // 彩带数量
    angle: 90,               // 90度 = 垂直朝上喷(从底部)
    spread: 60,              // 喷射角度范围
    startVelocity: 70,       // 初速度，越大喷越高
    origin: { y: 0.9, x: 0.5 } // 起点:底部90%高度、水平居中
  })
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
    // 先取已有实例，取不到再 init
  const line = echarts.getInstanceByDom(lineRef.value) || echarts.init(lineRef.value)
  const pie  = echarts.getInstanceByDom(pieRef.value)  || echarts.init(pieRef.value)

  line.setOption({
    title: { text: '各部位训练量趋势(总容量)' },
    tooltip: {},
    legend: {},
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series
  })

  pie.setOption({
    title: { text: '各部位记录占比' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: '65%',
      data: partPieData()
    }]
  })

  line.resize()
  pie.resize()
}

// ---- 日历 ----
const selectedDate = ref(new Date())
function isTrained(dayStr) {
  const prefix = dayStr.slice(0, 10)          // '2026-10-21'
  return workoutList.value.some(w => (w.date || '').slice(0, 10) === prefix)
}

// 导入导出
async function exportData() {
  const data = JSON.stringify(workoutList.value, null, 2)
  const fileName = `fitness-backup-${new Date().toISOString().slice(0, 10)}.json`

  // ① 支持 File System Access API（Chrome/Edge）：能准确知道是否真的保存
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'JSON 备份', accept: { 'application/json': ['.json'] } }]
      })
      // 用户确实选了位置，才执行写入
      const writable = await handle.createWritable()
      await writable.write(data)
      await writable.close()        // 到这里文件已落盘
      markBackup()                  // ✅ 真正保存成功才更新时间
      ElMessage.success('备份已保存')
    } catch (err) {
      if (err.name === 'AbortError') {
        // 用户点了"取消"——什么都不做，不更新备份时间
        return
      }
      ElMessage.warning('保存失败，请重试')
    }
    return
  }

  // ② 不支持的浏览器（Safari 等）：退回老方案，无法感知取消
  const blob = new Blob([data], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
  markBackup()   // ⚠️ 降级分支无法确认，仍按"已尝试"处理
}

function importData(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)          // 解析
      if (!Array.isArray(parsed)) throw new Error('格式不对') // 最简单的校验
      workoutList.value = parsed                          // 覆盖现有数据
      // localStorage 由你的 watch 自动更新，不用手动 set
      markBackup()          // ← 新增：导入后本地已是最新，重置备份计时
      ElMessage.success(`导入成功，共 ${parsed.length} 次记录`)
    } catch (err) {
      ElMessage.warning('导入失败：文件不是有效的备份格式')
    }
  }
  reader.readAsText(file)
}

// ---- 备份提醒 ----
const BACKUP_REMIND_DAYS = 7                    // 超过多少天没备份就提醒，可改
const lastBackup = ref(Number(localStorage.getItem('lastBackupTime')) || 0)
const hideBackupTip = ref(false)

const needBackupTip = computed(() => {
  if (hideBackupTip.value) return false
  if (!workoutList.value.length) return false   // 还没训练数据，不提醒
  if (!lastBackup.value) return true            // 从没备份过 → 提醒
  const diffDays = (Date.now() - lastBackup.value) / (1000 * 60 * 60 * 24)
  return diffDays >= BACKUP_REMIND_DAYS
})

const backupTipText = computed(() => {
  if (!lastBackup.value) return '你还没有备份过训练记录'
  const days = Math.floor((Date.now() - lastBackup.value) / (1000 * 60 * 60 * 24))
  return `已 ${days} 天没备份训练记录`
})

// 记录"刚刚备份过"
function markBackup() {
  lastBackup.value = Date.now()
  localStorage.setItem('lastBackupTime', String(lastBackup.value))
  hideBackupTip.value = true                    // 备份后本条自动消失
}

// 初始进来时，如果当前就在图表页，先渲染一次
onMounted(async () => {
  pro.value = await restorePro()
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

// 窗口尺寸变化时，让图表跟着自适应
function resizeCharts() {
  if (lineRef.value) echarts.getInstanceByDom(lineRef.value)?.resize()
  if (pieRef.value)  echarts.getInstanceByDom(pieRef.value)?.resize()
}
onMounted(() => window.addEventListener('resize', resizeCharts))
onBeforeUnmount(() => window.removeEventListener('resize', resizeCharts))

// ---- 回到顶部 ----
const showBackTop = ref(false)
function onScroll() {
  showBackTop.value = window.scrollY > 300   // 滚动超过 300px 才显示
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
onMounted(() => window.addEventListener('scroll', onScroll))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// ---- 付费解锁 ----
const pro = ref(false)
const showActivate = ref(false)
const inputCode = ref('')
const activating = ref(false)
const PURCHASE_LINK = 'https://afdian.com/item/54903ff6cd4c11f1bf2952540025c377'   // ← 以后换成你的发卡购买页链接

function goPurchase() {
  window.open(PURCHASE_LINK, '_blank')
}
async function activateCode() {
  if (!inputCode.value.trim()) {
    ElMessage.warning('请输入激活码')
    return
  }
  activating.value = true
  const ok = await verifyCode(inputCode.value)
  activating.value = false
  if (ok) {
    saveCode(inputCode.value.trim())
    pro.value = true
    showActivate.value = false
    inputCode.value = ''
    ElMessage.success('激活成功，已解锁全部 Pro 功能 🎉')
    successAction()                       // 复用你的彩带庆祝
    if (currentTab.value === 'chart') {
      await nextTick()
      renderCharts()
    }
  } else {
    ElMessage.error('激活码无效，请检查后重试')
  }
}
</script>

<style scoped>
/* ================= 设计基调 ================= */
.app {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  box-sizing: border-box;
  font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #303133;
  background: #f5f7fa;      /* 浅灰底，突出白卡片 */
  min-height: 100vh;
  box-sizing: border-box;
}

/* ================= 顶部标题栏 ================= */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0px;
  margin-bottom: 12px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(245, 247, 250, .85);
  backdrop-filter: blur(1px);
}
.app-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  letter-spacing: .5px;
}

/* ================= Tab 导航 ================= */
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
}
.tab {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #606266;
  font-size: 15px;
  cursor: pointer;
  transition: all .2s;
}
.tab:hover { color: #409eff; background: #ecf5ff; }
.tab.active {
  background: #409eff;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(64, 158, 255, .35);
}

/* ================= 面板与卡片 ================= */
.panel {
  width: 100%;
}
.card {
  width: 100%; box-sizing: border-box;
  padding-bottom: 20px;
}

/* ================= 今日区 ================= */
.today-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.today-meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}
.today-label { font-size: 15px; font-weight: 600; }
.today-date { font-size: 13px; color: #909399; }
.today-volume { font-size: 13px; color: #606266; }
.today-volume b { color: #409eff; font-size: 18px; margin-left: 2px; }

/* 新增记录：虚线按钮 */
.add-btn {
  width: 100%;
  height: 42px;
  margin-top: 12px;
  border: 1px dashed #c8d6ea !important;
  border-radius: 8px;
  color: #409eff !important;
  background: #fafcff !important;
}
.add-btn:hover {
  background: #ecf5ff !important;
  border-color: #409eff !important;
}

/* ================= 区块标题 ================= */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.head-actions { display: flex; gap: 8px; }

.streak {
  margin: 0 0 14px;
  font-size: 14px;
  color: #606266;
}
.streak b { color: #e6a23c; font-size: 18px; margin: 0 2px; }

/* ================= 表格统一 ================= */
.app-table { border-radius: 10px; overflow: hidden; }
.app-table :deep(.el-table__header th) {
  background: #f7f9fc !important;
  color: #606266;
  font-weight: 600;
}

/* 统一所有按钮圆角 */
:deep(.el-button) { border-radius: 8px; }

/* ================= 图表 ================= */
.chart { width: 100%; height: 320px; }

/* ================= 日历 ================= */
.cal-cell {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all .2s;
}
.cal-cell.trained {
  background: #67c23a;
  color: #fff;
  font-weight: 600;
}
.hint {
  color: #909399;
  font-size: 13px;
  margin: 12px 0 0;
  text-align: center;
}

/* ================= 展开行 ================= */
.expand-box {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.expand-item {
  display: grid;
  grid-template-columns: 72px 130px 1fr 96px;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f7f9fc;
  border-radius: 8px;
  font-size: 14px;
  color: #303133;
}
.part-tag {
  justify-self: stretch;
  text-align: center;
  padding: 2px 0;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.action-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.detail {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
}
.detail .num { min-width: 62px; white-space: nowrap; }
.detail b { color: #409eff; font-weight: 600; }
.detail i { color: #c0c4cc; font-style: normal; }
.volume {
  text-align: right;
  font-size: 12px;
  color: #909399;
}
/* 回到顶部 */
.back-top {
  position: fixed;
  right: 24px;
  bottom: 32px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(64, 158, 255, .45);
  z-index: 100;
  transition: all .2s;
}
.back-top:hover {
  background: #337ecc;
  transform: translateY(-2px);
}
.fade-enter-active,
.fade-leave-active { transition: opacity .25s; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* 备份提醒条 */
.backup-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 10px;
  color: #b88230;
  font-size: 13px;
}
.backup-tip-btns { display: flex; gap: 4px; flex-shrink: 0; }

.pro-badge {
  padding: 3px 10px;
  background: linear-gradient(135deg, #ffd666, #ffa940);
  color: #7a4400;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}
.lock-card {
  text-align: center;
  padding: 60px 20px;
}
.lock-icon { font-size: 48px; margin-bottom: 12px; }
.lock-card h3 { margin: 0 0 8px; font-size: 19px; }
.lock-card p { color: #909399; font-size: 14px; margin: 0 0 24px; }
.lock-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

/* ================= 手机端 ================= */
@media (max-width: 640px) {
  .app { padding: 16px 12px 48px; }

  /* 标题和 tab 竖排，tab 平分整行 */
  .app-header { flex-direction: column; align-items: stretch; gap: 12px; }
  .app-title { font-size: 19px; text-align: center; }
  .tabs { width: 100%; }
  .tab { flex: 1; padding: 8px 0; font-size: 14px; }

  .card { padding: 14px; border-radius: 12px; }

  /* 今日区竖排，"训练完成"拉满 */
  .today-bar { flex-direction: column; align-items: stretch; gap: 10px; }
  .today-bar :deep(.el-button) { width: 100%; }

  /* 历史区标题和按钮竖排，按钮平分 */
  .section-head { flex-direction: column; align-items: stretch; gap: 10px; }
  .head-actions { display: flex; gap: 8px; }
  .head-actions :deep(.el-button) { flex: 1; margin: 0; }

  .chart { height: 260px; }

  /* 展开行改两行：第一行 部位/动作/容量，第二行 详情 */
  .expand-item {
    grid-template-columns: 56px 1fr auto;
    grid-template-areas:
      "part action volume"
      "detail detail detail";
    row-gap: 6px;
    column-gap: 8px;
  }
  .part-tag    { grid-area: part; }
  .action-name { grid-area: action; }
  .volume      { grid-area: volume; }
  .detail      { grid-area: detail; }
}
</style>