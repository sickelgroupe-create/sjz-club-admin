<template>
  <el-card shadow="never">
    <h2>钱包总览</h2><p>选择用户查看余额和指定日期流水；余额调整不改变冻结资金、累计收入或历史记录。</p>
    <el-form inline @submit.prevent="search"><el-form-item><el-input v-model="query.keyword" placeholder="用户 UID（如 ID68）、昵称或账号" clearable @keyup.enter="search"/></el-form-item><el-button type="primary" @click="search">查询</el-button></el-form>
    <el-table :data="rows" v-loading="loading" stripe @row-click="open">
      <el-table-column label="用户" min-width="200"><template #default="{row}"><el-button link type="primary" @click.stop="open(row)">{{row.nickname || '未填写昵称'}}（ID：{{row.user_id}}）</el-button></template></el-table-column>
      <el-table-column v-for="(label,key) in amounts" :key="key" :label="label" min-width="130"><template #default="{row}">¥{{money(row[key])}}</template></el-table-column>
      <el-table-column label="更新时间" min-width="180"><template #default="{row}">{{formatTime(row.updated_at)}}</template></el-table-column>
      <el-table-column label="操作" width="120"><template #default="{row}"><el-button link type="primary" @click.stop="open(row)">钱包与流水</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load"/>
  </el-card>
  <el-drawer v-model="drawer" :title="wallet ? `${wallet.nickname || '用户'}（ID：${wallet.user_id}）钱包` : '用户钱包'" size="85%" destroy-on-close>
    <template v-if="wallet">
      <el-descriptions border :column="4"><el-descriptions-item v-for="(label,key) in amounts" :key="key" :label="label">¥{{money(wallet[key])}}</el-descriptions-item></el-descriptions>
      <p><el-button v-hasPermi="['club:wallet:adjust']" type="warning" @click="openAdjust">调整可用余额</el-button></p>
      <h3>用户钱包流水</h3><el-form inline><el-form-item label="日期范围"><el-date-picker v-model="dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期"/></el-form-item><el-button type="primary" @click="searchRecords">查询流水</el-button><el-button @click="resetRecords">全部日期</el-button></el-form>
      <el-table :data="records" v-loading="recordLoading" stripe>
        <el-table-column label="时间" width="170"><template #default="{row}">{{formatTime(row.created_at)}}</template></el-table-column>
        <el-table-column label="类型" width="160"><template #default="{row}">{{types[row.record_type] || '其他资金变动'}}</template></el-table-column>
        <el-table-column label="变动金额" width="120"><template #default="{row}">{{Number(row.amount)>0?'+':''}}{{money(row.amount)}}</template></el-table-column>
        <el-table-column v-for="(label,key) in ledgerAmounts" :key="key" :label="label" width="125"><template #default="{row}">¥{{money(row[key])}}</template></el-table-column>
        <el-table-column prop="reference_no" label="业务流水号" min-width="210" show-overflow-tooltip/>
        <el-table-column prop="order_no" label="关联订单号" min-width="190"/>
        <el-table-column prop="description" label="说明 / 调整原因" min-width="240" show-overflow-tooltip/>
        <el-table-column prop="adjusted_by" label="调整管理员ID" width="130"/>
      </el-table>
      <pagination v-show="recordTotal>0" :total="recordTotal" v-model:page="recordQuery.pageNum" v-model:limit="recordQuery.pageSize" @pagination="loadRecords"/>
    </template>
  </el-drawer>
  <el-dialog v-model="adjustOpen" title="调整用户可用余额" width="500px" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
    <el-alert title="此操作会实际变更余额并生成永久流水。不会修改冻结金额。" type="warning" :closable="false"/>
    <p v-if="wallet">{{wallet.nickname}}（ID：{{wallet.user_id}}），当前可用余额 ¥{{money(wallet.balance)}}</p>
    <el-form label-width="90px" :disabled="saving || !!pending">
      <el-form-item label="调整方向"><el-radio-group v-model="form.direction"><el-radio value="credit">增加余额</el-radio><el-radio value="debit">扣减余额</el-radio></el-radio-group></el-form-item>
      <el-form-item label="调整金额"><el-input-number v-model="form.amount" :min="0.01" :max="9999999999.99" :precision="2" :step="1"/></el-form-item>
      <el-form-item label="调整原因"><el-input v-model="form.reason" type="textarea" maxlength="200" show-word-limit placeholder="必填：说明本次调整的业务原因"/></el-form-item>
    </el-form>
    <el-alert v-if="pending" title="请求结果尚未确认。重试会使用原操作号，不会重复入账。" type="info" :closable="false"/>
    <template #footer><el-button :disabled="saving" @click="adjustOpen=false">关闭</el-button><el-button type="primary" :loading="saving" @click="submit">{{pending?'确认原操作结果':'确认调整'}}</el-button></template>
  </el-dialog>
</template>
<script setup>
import {ref,reactive,onMounted,watch} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import {listClubEntity,getClubEntity,getWalletRecords,adjustWallet} from '@/api/club'
import {formatTime} from '@/utils/club-display'
import useUserStore from '@/store/modules/user'
const props=defineProps({userId:[String,Number]})
const amounts={balance:'可用余额',frozen:'冻结金额',total_income:'累计服务收入',total_withdrawn:'累计提现'}
const ledgerAmounts={balance_before:'变动前余额',balance_after:'变动后余额',frozen_after:'冻结余额'}
const types={admin_credit:'管理员增加余额',admin_debit:'管理员扣减余额',order_payment:'订单余额支付',order_refund:'订单退款',recharge:'充值',income:'服务收益入账',income_protected:'服务收益冻结',income_release:'服务收益解冻',settlement_reversal:'退款冲正',receivable_recovery:'追偿抵扣',receivable_writeoff:'追偿核销',withdraw_frozen:'提现冻结',withdraw_approved:'提现审核通过',withdraw_rejected:'提现驳回',withdraw_auto_cancel:'提现自动取消',account_merge:'账号合并转入'}
const rows=ref([]),total=ref(0),loading=ref(false),drawer=ref(false),wallet=ref(null),records=ref([]),recordTotal=ref(0),recordLoading=ref(false),dates=ref([])
const query=reactive({keyword:'',pageNum:1,pageSize:20}),recordQuery=reactive({pageNum:1,pageSize:20})
const adjustOpen=ref(false),saving=ref(false),pending=ref(null),form=reactive({direction:'credit',amount:1,reason:''})
let walletVersion=0,recordsVersion=0
const money=n=>Number(n||0).toFixed(2)
async function load(){loading.value=true;try{const r=await listClubEntity('wallets',query);rows.value=r.data.rows;total.value=r.data.total}finally{loading.value=false}}
function search(){query.pageNum=1;load()}
async function open(row){const version=++walletVersion;const r=await getClubEntity('wallets',row.user_id);if(version!==walletVersion)return;wallet.value=r.data;drawer.value=true;dates.value=[];recordQuery.pageNum=1;records.value=[];loadRecords()}
async function loadRecords(){if(!wallet.value)return;const version=++recordsVersion;recordLoading.value=true;try{const r=await getWalletRecords(wallet.value.user_id,{...recordQuery,startDate:dates.value?.[0]||'',endDate:dates.value?.[1]||''});if(version===recordsVersion){records.value=r.data.rows;recordTotal.value=r.data.total}}finally{if(version===recordsVersion)recordLoading.value=false}}
function searchRecords(){recordQuery.pageNum=1;loadRecords()}
function resetRecords(){dates.value=[];searchRecords()}
function storageKey(){return `club-wallet-pending-${useUserStore().id}-${wallet.value.user_id}`}
function openAdjust(){pending.value=null;try{pending.value=JSON.parse(sessionStorage.getItem(storageKey())||'null')}catch(_){}Object.assign(form,pending.value||{direction:'credit',amount:1,reason:''});adjustOpen.value=true}
async function submit(){
  if(saving.value)return
  if(!pending.value){if(!form.amount || !form.reason.trim()){ElMessage.warning('请输入调整金额和原因');return}
    try{await ElMessageBox.confirm(`确认${form.direction==='credit'?'增加':'扣减'}用户 ${wallet.value.user_id} 的余额 ¥${money(form.amount)}？`,'确认资金调整',{type:'warning'})}catch(_){return}
    pending.value={direction:form.direction,amount:form.amount,reason:form.reason.trim(),requestId:`wallet-${crypto.randomUUID()}`}
    sessionStorage.setItem(storageKey(),JSON.stringify(pending.value))
  }
  saving.value=true
  try{const r=await adjustWallet(wallet.value.user_id,pending.value);sessionStorage.removeItem(storageKey());pending.value=null;adjustOpen.value=false;ElMessage.success(`调整成功：¥${money(r.data.balanceBefore)} → ¥${money(r.data.balanceAfter)}`);wallet.value=(await getClubEntity('wallets',wallet.value.user_id)).data;await Promise.all([load(),loadRecords()])}
  catch(e){if([400,403,409].includes(e.response?.status)){sessionStorage.removeItem(storageKey());pending.value=null}}
  finally{saving.value=false}
}
watch(()=>props.userId,id=>{if(id)open({user_id:id})},{immediate:true})
onMounted(load)
</script>
<style scoped>h2{margin-top:0}p{color:#67748a}.el-form{margin-top:20px}.el-card{border-radius:16px}.el-table{cursor:pointer}</style>
