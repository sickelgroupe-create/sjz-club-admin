<template>
  <section class="refund-details">
    <h3>退款进度</h3>
    <el-alert :title="summary.state" :description="summary.notice" type="info" :closable="false" show-icon />
    <el-descriptions :column="2" border class="refund-summary">
      <el-descriptions-item label="订单单号">{{ row.orderNo || '未提供' }}</el-descriptions-item>
      <el-descriptions-item label="支付及退款去向">{{ summary.channel }}</el-descriptions-item>
      <el-descriptions-item label="售后进度">{{ aftersaleStatus(row.status) }}</el-descriptions-item>
      <el-descriptions-item label="退款金额">{{ money(row.refund_amount) }}</el-descriptions-item>
      <el-descriptions-item label="打手处理时间">{{ formatTime(row.provider_processed_at) }}</el-descriptions-item>
      <el-descriptions-item label="平台审核时间">{{ formatTime(row.reviewed_at) }}</el-descriptions-item>
      <el-descriptions-item label="退款确认时间">{{ formatTime(row.refunded_at) }}</el-descriptions-item>
      <el-descriptions-item label="退款单号">{{ row.refund_idempotency_key || '尚未发起' }}</el-descriptions-item>
      <el-descriptions-item label="打手处理说明">{{ row.provider_note || '未填写' }}</el-descriptions-item>
      <el-descriptions-item label="平台审核说明">{{ row.review_note || '未填写' }}</el-descriptions-item>
    </el-descriptions>
    <h3>处理记录</h3>
    <el-table :data="Array.isArray(row.logs)?row.logs:[]" border empty-text="暂无处理记录" max-height="320">
      <el-table-column label="处理时间" width="175"><template #default="{row:log}">{{formatTime(log.createdAt)}}</template></el-table-column>
      <el-table-column label="处理方" width="95"><template #default="{row:log}">{{refundActor(log.operatorType)}}</template></el-table-column>
      <el-table-column label="处理结果" min-width="155"><template #default="{row:log}">{{aftersaleStatus(log.toStatus)}}</template></el-table-column>
      <el-table-column prop="note" label="处理说明" min-width="180"/>
    </el-table>
    <template v-if="row.receivables?.length">
      <h3>打手退款追偿</h3>
      <el-table :data="row.receivables" border>
        <el-table-column prop="receivableNo" label="追偿单号" min-width="160"/>
        <el-table-column label="应追回"><template #default="{row:r}">{{money(r.amount)}}</template></el-table-column>
        <el-table-column label="已追回"><template #default="{row:r}">{{money(r.recoveredAmount)}}</template></el-table-column>
      </el-table>
    </template>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import { formatTime } from '@/utils/club-display'
import { aftersaleStatus, refundActor, refundSummary } from '@/utils/club-refund-display.mjs'
const props=defineProps({row:{type:Object,required:true}})
const summary=computed(()=>refundSummary(props.row))
const money=value=>value==null?'未提供':'¥'+Number(value).toFixed(2)
</script>
<style scoped>
.refund-details{margin-top:20px}.refund-summary{margin-top:14px}.refund-details h3{font-size:16px;margin:18px 0 12px}
</style>
