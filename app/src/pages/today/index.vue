<script setup lang="ts">
import TodayDashboard from '../../features/today/TodayDashboard.vue'
</script>
<!-- 今日任务独立承载逐项操作；首页仅展示摘要，两个路由复用同一份 Mock 状态。 -->
<template><TodayDashboard task-page /></template>
