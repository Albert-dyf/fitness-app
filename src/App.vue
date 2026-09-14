<template>
  <el-text class="mx-1" size="large">我的健身记录</el-text>
  <el-table :data="workoutList" border style="width:100%">
    <el-table-column prop="date" label="时间" min-width="200">
      <template #default="{ row }">
        <el-date-picker
          v-model="row.date"
          type="date"
        ></el-date-picker>
      </template>
    </el-table-column>
    <el-table-column prop="part" label="部位" width="180">
      <template #default="{ row }">
        <el-input v-model="row.part"></el-input>
      </template>
    </el-table-column>
    <el-table-column prop="exercise" label="动作" width="180">
      <template #default="{ row }">
        <el-input v-model="row.exercise"></el-input>
      </template>
    </el-table-column>
    <el-table-column prop="weight" label="重量kg">
      <template #default="{ row }">
        <el-input v-model="row.weight"></el-input>
      </template>
    </el-table-column>
    <el-table-column prop="reps" label="次数">
      <template #default="{ row }">
        <el-input v-model="row.reps"></el-input>
      </template>
    </el-table-column>
    <el-table-column prop="group" label="组数">
      <template #default="{ row }">
        <el-input v-model="row.group"></el-input>
      </template>
    </el-table-column>
    <el-table-column fixed="right" label="操作">
      <template #default="scope">
        <el-button link size="small" color="red" @click="clickDelet(scope)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
  <el-button primary dashed @click="addWorkout">添加</el-button>
</template>

<script setup>
import {ref, watch } from 'vue'

// workout data construct
const workout = {
  id: 0,
  date: '',
  part: '',
  exercise: '',
  weight: 0,
  reps: 0,
  group: 0
}

const workoutList = ref(JSON.parse(localStorage.getItem('workoutList')) || [
  {id: 1, date: '2026-9-13', part: "背", exercise: '辅助引体向上', weight: 45, reps: 8, group: 4},
  {id: 2, date: '2026-9-13', part: "背", exercise: '高位下拉', weight: 30, reps: 12, group: 4}
])

// 监听数据变化
watch(workoutList, (val) => {
  localStorage.setItem('workoutList', JSON.stringify(val))
}, {deep: true})

function clickDelet(workout) {
  workoutList.value.splice(workout.$index, 1)
}

function addWorkout() {
  workoutList.value.push({
    id: workoutList.value.length + 1,
    date: Date.now(),
    part: '',
    exercise: '',
    weight: 0,
    reps: 0,
    group: 0
  })
}
</script>
