<template>
  <div class="app-container club-dashboard">
    <div class="hero">
      <div>
        <p>PRIDE ESPORTS CLUB</p>
        <h2>运营工作台</h2>
        <span>先处理待办，再维护商品和活动</span>
      </div>
      <el-tag type="warning" effect="dark" round>实时业务数据</el-tag>
    </div>
    <div class="quick-actions"><el-button v-for="action in visibleActions" :key="action.entity" @click="router.push({path:action.path,query:{entity:action.entity,...action.query}})">{{action.label}}</el-button></div>
    <el-row :gutter="18" v-loading="loading">
      <el-col v-for="card in cards" :key="card.key" :xs="12" :sm="8" :lg="6">
        <div class="metric-card" role="link" tabindex="0" @click="openCard(card)" @keydown.enter="openCard(card)">
          <div :class="['metric-icon', card.tone]"><svg-icon :icon-class="card.icon" /></div>
          <div><span>{{ card.label }}</span><strong>{{ formatValue(card) }}</strong></div>
        </div>
      </el-col>
    </el-row>
    <el-card class="recent" shadow="never">
      <template #header><div class="section-head"><strong>最近订单</strong><span>数据来自真实业务表</span></div></template>
      <el-table :data="data.recentOrders || []">
        <el-table-column prop="orderNo" label="订单号" min-width="180" />
        <el-table-column prop="productName" label="商品/服务" min-width="180" />
        <el-table-column prop="totalAmount" label="金额" width="120"><template #default="s">¥{{ s.row.totalAmount }}</template></el-table-column>
        <el-table-column prop="status" label="状态" width="120"><template #default="s"><el-tag>{{ statusText[s.row.status] || s.row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170"><template #default="s">{{formatTime(s.row.createdAt)}}</template></el-table-column>
        <el-table-column label="操作" width="100"><template #default="s"><el-button v-hasPermi="['club:order:detail']" link type="primary" @click="router.push({path:'/club/orders',query:{orderId:s.row.id}})">查看订单</el-button></template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { dashboardTarget, formatTime, stateLabels } from '@/utils/club-display'
import { getClubDashboard } from '@/api/club'
import auth from '@/plugins/auth'
const visibleActions=computed(()=>[
  {label:'审核新打手',path:'/club/players',entity:'applications',permission:'application',query:{status:'pending'}},
  {label:'处理提现',path:'/club/wallets',entity:'withdrawals',permission:'withdrawal',query:{status:'pending'}},
  {label:'维护商品与打手',path:'/club/products',entity:'products',permission:'product'},
  {label:'设置充值赠券',path:'/club/coupons',entity:'rechargeRules',permission:'coupon'}
].filter(a=>auth.hasPermi(`club:${a.permission}:list`)))

const router = useRouter()
function openCard(card){const target=dashboardTarget(card.key);if(target)router.push(target)}
const loading = ref(false)
const data = ref({})
const cards = [
  { key:'users', label:'小程序用户', icon:'user', tone:'blue' },
  { key:'products', label:'在售商品', icon:'shopping', tone:'purple' },
  { key:'orders', label:'全部订单', icon:'clipboard', tone:'orange' },
  { key:'paidOrders', label:'已支付', icon:'money', tone:'green' },
  { key:'pendingApplications', label:'待审打手', icon:'peoples', tone:'orange' },
  { key:'pendingWithdrawals', label:'待处理提现', icon:'money', tone:'purple' },
  { key:'paidRevenue', label:'实付成交额', icon:'chart', tone:'green', money:true }
]
const statusText = { ...stateLabels, unpaid:'待付款', pending:'待接单', accepted:'已接单', review:'待评价', done:'已完成', refund:'已退款', cancelled:'已取消' }
const formatValue = card => card.money ? `¥${Number(data.value[card.key] || 0).toFixed(2)}` : (data.value[card.key] || 0)
async function load() {
  loading.value = true
  try { data.value = (await getClubDashboard()).data || {} } finally { loading.value = false }
}
onMounted(load)
</script>

<style scoped lang="scss">
.quick-actions{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 20px}.quick-actions :deep(.el-button+.el-button){margin-left:0}
.club-dashboard{background:#f4f6fb;min-height:calc(100vh - 84px)}
.hero{min-height:150px;margin-bottom:20px;padding:28px 34px;display:flex;align-items:center;justify-content:space-between;border-radius:18px;background:linear-gradient(125deg,#314d9e,#796bd7);color:#fff;box-shadow:0 14px 34px rgba(53,72,154,.2)}
.hero p{margin:0 0 7px;color:#e6cb79;letter-spacing:3px;font-size:12px}.hero h2{margin:0 0 10px;font-size:26px}.hero span{opacity:.78}
.metric-card{cursor:pointer;height:112px;margin-bottom:18px;padding:22px;display:flex;align-items:center;gap:16px;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(39,54,91,.06)}
.metric-icon{width:54px;height:54px;display:flex;align-items:center;justify-content:center;border-radius:16px;font-size:24px}.blue{color:#496be7;background:#edf1ff}.purple{color:#7e5ddb;background:#f1edff}.orange{color:#e98b32;background:#fff1e5}.green{color:#25a568;background:#e9f8f0}
.metric-card>div:last-child{display:flex;flex-direction:column;gap:8px;color:#7b8499}.metric-card strong{color:#1f2637;font-size:24px}.recent{border:0;border-radius:16px}.section-head{display:flex;align-items:center;justify-content:space-between}.section-head span{color:#929bad;font-size:13px}
</style>
