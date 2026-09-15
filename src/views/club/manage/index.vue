<template>
  <div class="app-container club-manage">
    <el-card shadow="never" class="toolbar workspace-bar">
      <div class="workspace-navigation"><strong>{{ workspace?.title || config.title }}</strong><el-button v-for="tab in workspaceTabs" :key="tab[0]" :type="entity===tab[0]?'primary':'default'" @click="switchEntity(tab[0])">{{tab[1]}}</el-button>
        <el-dropdown v-if="moreTabs.length" @command="switchEntity"><el-button :type="moreTabs.some(t=>t[0]===entity)?'primary':'default'">更多设置与记录 ▾</el-button><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="tab in moreTabs" :key="tab[0]" :command="tab[0]">{{tab[1]}}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      </div><p class="workspace-hint">{{workspace?.hint}}</p>
    </el-card>
    <WalletManager :user-id="route.query.userId" v-if="['wallets','walletRecords','wallet-records'].includes(entity)"/>
    <template v-else>
    <TeenRules v-if="entity==='teenSettings'"/>
    <el-card class="toolbar" shadow="never">
      <el-form :inline="true" :model="query">
        <el-form-item><el-input v-model="query.keyword" clearable :placeholder="['users','players'].includes(entity)?'输入用户 UID 或昵称':'搜索关键字'" @keyup.enter="search"><template #prefix><svg-icon icon-class="search" /></template></el-input></el-form-item>
        <el-form-item v-if="config.status"><el-select v-model="query.status" clearable placeholder="全部状态" style="width:150px"><el-option v-for="item in config.status" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
        <el-form-item v-if="config.create && (entity!=='customerConfig'||total===0)"><el-button v-hasPermi="[savePermission]" type="warning" plain @click="openCreate"><svg-icon icon-class="edit" /> 新增</el-button></el-form-item>
      </el-form>
      <div class="context"><div><strong>{{ config.title }}</strong><span>{{ config.description }}</span></div></div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div class="list-options"><div><span>共 {{total}} 条</span><el-button v-if="['applications','withdrawals'].includes(entity)" link type="primary" @click="query.status=query.status==='pending'?'':'pending';search()">{{query.status==='pending'?'查看全部':'只看待处理'}}</el-button></div><el-switch v-if="compactColumns[entity]" v-model="showAllColumns" active-text="显示全部字段"/></div>
      <el-table v-loading="loading" :data="rows" stripe>
        <el-table-column v-for="column in listColumns" :key="column.prop" :prop="column.prop" :label="column.label" :min-width="column.width || 120" :show-overflow-tooltip="column.prop!=='readiness'">
          <template #default="scope">
            <el-image v-if="column.image && scope.row[column.prop]" :src="assetUrl(scope.row[column.prop])" fit="cover" class="thumb" :preview-src-list="[assetUrl(scope.row[column.prop])]" preview-teleported />
            <el-tag v-else-if="column.status" :type="tagType(scope.row[column.prop])">{{ statusLabel(scope.row[column.prop]) }}</el-tag>
            <span v-else-if="column.money">¥{{ Number(scope.row[column.prop] || 0).toFixed(2) }}</span>
            <span v-else-if="column.boolean">{{ Number(scope.row[column.prop]) ? '是' : '否' }}</span>
            <span v-else-if="column.prop==='provider_type'">{{ providerLabel(scope.row[column.prop]) }}</span>
            <span v-else-if="column.prop==='bound_player_id'">{{ playerNames[scope.row[column.prop]] || (scope.row[column.prop] ? '打手 #'+scope.row[column.prop] : '待绑定') }}</span>
            <span v-else-if="entity==='businessConfig' && column.prop==='config_value'">{{businessValue(scope.row.config_key,scope.row.config_value)}}</span>
            <span v-else-if="entity==='businessConfig' && column.prop==='description'">{{businessMeta(scope.row.config_key).help}}</span>
            <span v-else-if="column.prop==='validity'">{{couponWindow(scope.row)}}</span>
            <span v-else-if="entity==='homeEntries' && column.prop==='target_url'">{{homeTargetLabel(scope.row.target_url,categoryOptions)}}</span>
            <span v-else-if="column.prop==='category_code'">{{categoryOptions.find(c=>c.code===scope.row.category_code)?.name||'未分类'}}</span>
            <span v-else-if="column.prop==='readiness'" style="white-space:normal;line-height:1.7">{{scope.row.readiness}}</span>
            <span v-else>{{ displayValue(column.prop, scope.row[column.prop], scope.row) }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="config.detail || config.edit || config.remove" label="操作" width="230" fixed="right">
          <template #default="scope">
            <el-button v-if="['users','players'].includes(entity)" v-hasPermi="['club:wallet:list']" link type="primary" @click="openWallet(scope.row)">钱包</el-button>
            <el-button v-if="entity==='users' && auth.hasPermiAnd(['club:coupon:edit','club:coupon:list'])" link type="primary" @click="openUserIssue(scope.row)">发券</el-button>
            <el-button v-if="entity==='coupons' && scope.row.distribution_mode==='targeted'" v-hasPermi="['club:coupon:edit']" link type="primary" @click="openIssue(scope.row)">指定发放</el-button>
            <el-button v-if="config.detail" v-hasPermi="[detailPermission]" link type="primary" @click="openDetail(scope.row)">{{entity==='applications'?'查看材料':'详情'}}</el-button>
            <el-button v-if="config.edit && canEditRow(entity,scope.row) && (entity!=='orders' || targetsFor(scope.row.status).length)" v-hasPermi="[savePermission]" link type="primary" @click="openEdit(scope.row)">{{ editLabel(entity) }}</el-button>
            <el-button v-if="entity==='orders' && ['pending','accepted','serving'].includes(scope.row.status)" v-hasPermi="[savePermission]" link type="danger" @click="openAbandon(scope.row)">放弃接单</el-button>
            <el-button v-if="config.remove" v-hasPermi="[deletePermission]" link type="danger" @click="remove(scope.row)">{{entity==='players'?'撤销资格 / 重新申请':entity==='coupons'?'删除':'停用 / 删除'}}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="total>0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
    </el-card>

    <el-dialog v-model="dialog.open" :title="dialog.title" width="680px" append-to-body destroy-on-close>
      <el-form ref="formRef" :model="form" label-width="112px">
        <el-alert v-if="entity==='products'" title="保存后同步商品页；打手须审核通过并在线接单，顾客才能下单。" type="info" :closable="false" class="form-notice"/>
        <el-alert v-if="entity==='withdrawals'" title="此操作不会自动转账。请先核实并实际打款，再填写真实凭证号；驳回会退回冻结余额。" type="warning" :closable="false" class="form-notice"/>
        <el-button v-if="hasExtraFields" link type="primary" @click="showExtraFields=!showExtraFields">{{ showExtraFields?'收起选填设置':'展开选填设置' }}</el-button>
        <el-form-item v-for="field in visibleFormFields" :key="field.prop" :label="field.label" :required="field.required">
          <template v-if="entity==='businessConfig' && field.prop==='config_key'"><span>{{businessMeta(form.config_key).label}}</span></template>
          <template v-else-if="entity==='businessConfig' && field.prop==='config_value'">
            <el-switch v-if="businessMeta(form.config_key).type==='switch'" v-model="form.config_value" active-value="1" inactive-value="0" active-text="开启" inactive-text="关闭"/>
            <el-select v-else-if="['select','multi'].includes(businessMeta(form.config_key).type)" v-model="configSelection" :multiple="businessMeta(form.config_key).type==='multi'" style="width:100%"><el-option v-for="o in businessMeta(form.config_key).options" :key="o.value" :label="o.label" :value="o.value"/></el-select>
            <el-time-picker v-else-if="businessMeta(form.config_key).type==='time'" v-model="form.config_value" format="HH:mm" value-format="HH:mm"/>
            <el-input-number v-else-if="businessMeta(form.config_key).type==='number'" v-model="configNumber" :min="businessMeta(form.config_key).min" :max="businessMeta(form.config_key).max" :precision="form.config_key==='platform_commission_rate'||form.config_key.includes('spend_limit')?2:0"/>
            <span v-else>由平台维护</span><div class="field-help">{{businessMeta(form.config_key).help}} {{businessMeta(form.config_key).unit?'单位：'+businessMeta(form.config_key).unit:''}}</div>
          </template>
          <el-select v-else-if="field.type==='user-multi'" v-model="form[field.prop]" multiple filterable remote reserve-keyword :remote-method="searchUsers" :loading="optionLoading" placeholder="输入用户 UID，例如 68、ID68" style="width:100%"><el-option v-for="item in userOptions" :key="item.id" :label="`${item.nickname || item.account}（UID：${item.id}）`" :value="item.id" /></el-select>
          <el-select v-else-if="field.type==='coupon-select'" v-model="form[field.prop]" filterable placeholder="请选择优惠券" style="width:100%"><el-option v-for="item in couponOptions" :key="item.id" :label="`${item.name}（库存 ${Number(item.total_count)-Number(item.issued_count)}）`" :value="item.id" /></el-select>
          <el-select v-else-if="field.type==='player-single'" v-model="form[field.prop]" filterable remote :remote-method="searchPlayers" :loading="optionLoading" placeholder="输入打手的用户 UID 或昵称" style="width:100%"><el-option v-for="p in playerOptions" :key="p.id" :value="p.id" :disabled="Number(p.admission_ready)===0" :label="p.display_name+'（UID：'+p.user_id+'）'+(Number(p.admission_ready)===0?'：审核未通过或账号停用':'')"/></el-select>
          <el-select v-else-if="field.type==='product-select'" v-model="form[field.prop]" filterable :clearable="!field.required" remote :remote-method="searchProducts" :placeholder="field.required?'搜索并选择商品':'留空适用全部商品'" style="width:100%"><el-option v-for="p in productOptions" :key="p.id" :value="p.id" :label="p.name"/></el-select>
          <el-select v-else-if="field.type==='category-select'" v-model="form[field.prop]" filterable placeholder="请选择商品分类" style="width:100%"><el-option v-for="c in categoryOptions" :key="c.code" :value="c.code" :label="c.name+(c.status==='active'?'':'（已停用）')" :disabled="c.status!=='active'"/></el-select>
          <ClubVoiceRecorder v-else-if="field.type==='voice'" v-model="form[field.prop]" @duration="form.voice_seconds=$event" @busy="voiceBusy=$event"/>
          <el-input v-else-if="field.type==='textarea'" v-model="form[field.prop]" type="textarea" :rows="field.rows || 4" :placeholder="field.placeholder" />
          <el-input-number v-else-if="field.type==='number'" v-model="form[field.prop]" :min="field.min ?? 0" :precision="field.precision ?? 0" style="width:100%" />
          <el-select v-else-if="field.type==='select'" v-model="form[field.prop]" :placeholder="field.placeholder || '请选择'" style="width:100%"><el-option v-for="item in fieldOptions(field)" :key="item.value" :label="item.label" :value="item.value" /></el-select>
          <el-switch v-else-if="field.type==='switch'" v-model="form[field.prop]" />
          <image-upload v-else-if="field.type==='image'" v-model="form[field.prop]" :limit="1" />
          <el-date-picker v-else-if="field.type==='datetime'" v-model="form[field.prop]" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" />
          <el-input v-else v-model="form[field.prop]" :placeholder="field.placeholder" :disabled="field.readonly" />
          <div v-if="field.help" class="field-help">{{ field.help }}</div>
        </el-form-item>
        <ProductSpecs v-if="entity==='products'" v-model="form.skus"/>
      </el-form>
      <template #footer><el-button @click="dialog.open=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="voiceBusy" @click="submit">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="abandonDialog.open" title="放弃接单" width="560px">
      <el-alert title="不会在此直接扣款或退款。请明确选择后续处理方式，并填写原因。" type="warning" :closable="false"/>
      <el-radio-group v-model="abandonDialog.mode" style="display:flex;flex-direction:column;align-items:flex-start;margin:20px 0">
        <el-radio value="aftersale">转入退款售后，核实后再退款</el-radio>
        <el-radio v-if="abandonDialog.row?.status==='accepted'" value="requeue">退回待接单，保留付款等待重新安排</el-radio>
      </el-radio-group>
      <el-input v-model="abandonDialog.note" type="textarea" :rows="3" maxlength="1000" placeholder="请填写放弃接单原因（必填）"/>
      <template #footer><el-button @click="abandonDialog.open=false">取消</el-button><el-button type="danger" :loading="saving" :disabled="!abandonDialog.mode||!abandonDialog.note.trim()" @click="submitAbandon">确认放弃接单</el-button></template>
    </el-dialog>
    <el-dialog v-model="issueDialog.open" title="给指定顾客发券" width="560px">
      <p v-if="issueDialog.customer">接收顾客：{{issueDialog.customer.nickname || issueDialog.customer.account}}（{{issueDialog.customer.id}}）</p>
      <el-select v-if="issueDialog.customer" v-model="issueDialog.coupon" value-key="id" filterable placeholder="选择要发放的优惠券" style="width:100%"><el-option v-for="coupon in couponOptions" :key="coupon.id" :value="coupon" :label="coupon.name"/></el-select>
      <template v-else><p>{{issueDialog.coupon?.name}}</p><el-select v-model="issueDialog.users" multiple filterable remote :remote-method="searchUsers" placeholder="输入用户 UID 或昵称" style="width:100%"><el-option v-for="u in userOptions" :key="u.id" :value="u.id" :label="(u.nickname||u.account)+'（UID：'+u.id+'）'"/></el-select></template>
      <p>每人发放张数</p><el-input-number v-model="issueDialog.quantity" :min="1" :max="100"/><template #footer><el-button @click="issueDialog.open=false">取消</el-button><el-button :loading="saving" :disabled="!issueDialog.coupon || !issueDialog.users.length" type="primary" @click="issueSelected">确认发放</el-button></template>
    </el-dialog>
    <el-dialog v-model="detail.open" :title="`${config.title}详情`" width="820px" append-to-body>
      <el-button v-if="entity==='orders'" link type="primary" @click="showDetailFields=!showDetailFields">{{showDetailFields?'收起完整资料':'展开完整订单资料'}}</el-button>
      <el-descriptions v-if="detail.row" :column="2" border>
        <el-descriptions-item v-for="column in visibleDetailColumns" :key="column.prop" :label="column.label">{{ detailValue(column, detail.row[column.prop]) }}</el-descriptions-item>
      </el-descriptions>
      <el-tabs v-if="entity==='orders' && detail.row" v-model="detailTab"><el-tab-pane v-for="[key,title,fields] in orderSections" :key="key" :name="key" :label="title"><el-table :data="detail.row[key] || []" max-height="300" border><el-table-column v-for="(label,prop) in fields" :key="prop" :label="label" min-width="140"><template #default="scope">{{displayValue(prop,scope.row[prop])}}</template></el-table-column></el-table></el-tab-pane></el-tabs>
      <template v-if="entity==='applications' && detail.row?.identity"><h3>身份核验（与入驻一次审核）</h3><el-descriptions :column="2" border><el-descriptions-item label="姓名">{{detail.row.identity.realName}}</el-descriptions-item><el-descriptions-item label="证件号">{{detail.row.identity.idNumber}}</el-descriptions-item><el-descriptions-item label="状态">{{statusLabel(detail.row.identity.status)}}</el-descriptions-item></el-descriptions><el-image v-for="url in identityEvidence" :key="url" :src="assetUrl(url)" :preview-src-list="identityEvidence.map(assetUrl)" style="width:180px;margin:12px" preview-teleported/></template>
      <template v-if="entity==='identities' && detail.row"><h3>审核材料</h3><el-alert v-if="!identityEvidence.length" title="该记录没有可查看的审核材料；历史脱敏记录不能还原原始材料。" type="info" :closable="false"/><el-image v-for="(url,index) in identityEvidence" :key="index" :src="assetUrl(url)" :preview-src-list="identityEvidence.map(assetUrl)" style="width:180px;margin:12px" fit="contain" preview-teleported/></template>
      <AftersaleDetails v-if="entity==='aftersales' && detail.row" :row="detail.row"/>
      <pre v-if="entity==='receivables' && detail.row" class="detail-json">{{ JSON.stringify(detail.row,null,2) }}</pre>
      <template #footer><el-button @click="detail.open=false">关闭</el-button><el-button v-if="entity==='orders'" v-hasPermi="['club:aftersale:list']" @click="switchEntity('aftersales')">退款售后</el-button><el-button v-if="config.edit && detail.row && canEditRow(entity,detail.row) && (entity!=='orders'||targetsFor(detail.row.status).length)" v-hasPermi="[savePermission]" type="primary" @click="editFromDetail">{{editLabel(entity)}}</el-button></template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup>
import ProductSpecs from './ProductSpecs.vue'
import {specificationError} from '@/utils/club-specifications.mjs'
import WalletManager from '../wallet/WalletManager.vue'
import TeenRules from './TeenRules.vue'
import {clubAssetUrl} from '@/utils/club-assets.mjs'
import {homeTargetOptions,homeTargetFields,homeTargetLabel} from '@/utils/club-catalog.mjs'
import ClubVoiceRecorder from '@/components/ClubVoiceRecorder/index.vue'
const voiceBusy=ref(false)
const occupancyNow=ref(Date.now())
let occupancyTimer=null,occupancyRefresh=0
function stopOccupancyTimer(){if(occupancyTimer)clearInterval(occupancyTimer);occupancyTimer=null}
function startOccupancyTimer(){stopOccupancyTimer();occupancyRefresh=Date.now();occupancyTimer=setInterval(async()=>{
  occupancyNow.value=Date.now()
  if(!['orders','players'].includes(entity.value)||document.hidden||dialog.open||loading.value||Date.now()-occupancyRefresh<30000)return
  occupancyRefresh=Date.now()
  try{if(detail.open&&detail.row){const type=entity.value,id=detail.row.id;const result=await getClubEntity(type,id);if(detail.open&&entity.value===type&&detail.row?.id===id)detail.row={...result.data,_occupiedObservedAt:Date.now()}}else await load()}catch{/* retain the last successful snapshot; manual refresh remains available */}
},1000)}
onMounted(startOccupancyTimer);onActivated(startOccupancyTimer);onDeactivated(stopOccupancyTimer);onBeforeUnmount(stopOccupancyTimer)
import { listClubEntity, getClubEntity, saveClubEntity, deleteClubEntity } from '@/api/club'
import { formatTime, stateLabels, targetsFor, detailFields, orderSections } from '@/utils/club-display'
import { providerLabel } from '@/utils/club-provider'
import AftersaleDetails from './AftersaleDetails.vue'
import auth from '@/plugins/auth'
import { workspaceFor, compactColumns, extraFields, editLabel, canEditRow, normalizeEntity } from '@/utils/club-workspace.mjs'
import { businessMeta,businessValue,operatorLabel,sceneOptions,homeRoleOptions,couponWindow,localDateTime } from '@/utils/club-operator-labels.mjs'

const route = useRoute()
const router = useRouter()
const { proxy } = getCurrentInstance()
const entity = computed(() => {const key=normalizeEntity(route.query.entity || route.path.split('/').pop() || 'users');return ({shops:'players',identities:'applications',playerServices:'products',skus:'products'})[key]||key})
const workspace=computed(()=>workspaceFor(entity.value))
const allowedTab=tab=>auth.hasPermi(`club:${tab[2]}:list`)
const workspaceTabs=computed(()=>(workspace.value?.main||[]).filter(allowedTab))
const moreTabs=computed(()=>(workspace.value?.more||[]).filter(allowedTab))
function switchEntity(value){dialog.open=false;detail.open=false;router.push({path:route.path,query:{entity:value}})}
const issueDialog=reactive({open:false,coupon:null,customer:null,users:[],quantity:1,key:''})
const abandonDialog=reactive({open:false,row:null,mode:'',note:'',requestId:''})
async function openAbandon(row){row={...row,...(await getClubEntity('orders',row.id)).data};if(!['pending','accepted','serving'].includes(row.status)){proxy.$modal.msgWarning('订单状态已变化，请刷新后重试');await load();return}Object.assign(abandonDialog,{open:true,row,mode:'',note:'',requestId:'abandon-'+Date.now()+'-'+row.id})}
async function submitAbandon(){if(saving.value||!abandonDialog.mode||!abandonDialog.note.trim())return;saving.value=true;try{await saveClubEntity('orders',{id:abandonDialog.row.id,action:'abandon',abandon_mode:abandonDialog.mode,note:abandonDialog.note.trim(),requestId:abandonDialog.requestId});proxy.$modal.msgSuccess(abandonDialog.mode==='aftersale'?'已转退款售后，尚未退款':'已退回待接单，付款保留');abandonDialog.open=false;await load()}finally{saving.value=false}}
async function openIssue(coupon){if(couponWindow(coupon)!=='有效期内'){proxy.$modal.alertWarning(couponWindow(coupon)+'，请先编辑优惠券的生效和失效时间。');return}Object.assign(issueDialog,{open:true,coupon,customer:null,users:[],quantity:1,key:'issue-'+Date.now()});await searchUsers('')}
async function openUserIssue(customer){await loadCouponOptions();Object.assign(issueDialog,{open:true,coupon:null,customer,users:[customer.id],quantity:1,key:'issue-'+Date.now()})}
function openWallet(row){router.push({path:route.path,query:{entity:'wallets',userId:entity.value==='players'?row.user_id:row.id}})}
async function issueSelected(){if(saving.value||!issueDialog.users.length||!issueDialog.coupon)return;saving.value=true;try{const result=await saveClubEntity('couponIssues',{coupon_id:issueDialog.coupon.id,user_ids:issueDialog.users,quantity:issueDialog.quantity,idempotency_key:issueDialog.key});const skipped=result.data?.skippedUsers||{};if(Object.keys(skipped).length)proxy.$modal.alertWarning('部分用户未发放：'+Object.entries(skipped).map(([id,reason])=>'用户'+id+'：'+reason).join('；'));else proxy.$modal.msgSuccess('发券成功');issueDialog.open=false;load()}finally{saving.value=false}}
const activeOptions = [{label:'正常',value:'active'},{label:'停用',value:'disabled'}]
const availabilityOptions = [{label:'启用',value:'active'},{label:'停用',value:'inactive'}]
const reviewOptions = [{label:'待审核',value:'pending'},{label:'已通过',value:'approved'},{label:'已驳回',value:'rejected'}]
const orderOptions = [{label:'已支付有效订单',value:'paid'},{label:'待付款',value:'unpaid'},{label:'待接单',value:'pending'},{label:'已接单',value:'accepted'},{label:'服务中',value:'serving'},{label:'退款中',value:'refunding'},{label:'已完成',value:'completed'},{label:'已退款',value:'refunded'},{label:'已取消',value:'cancelled'}]
const orderTargetOptions = orderOptions.filter(item=>['accepted','serving','completed','cancelled'].includes(item.value))
const definitions = {
  users:{title:'顾客管理',description:'独立账号、资料、角色和启停状态',status:activeOptions,edit:true,columns:[c('id','用户 UID'),c('account','账号'),c('nickname','昵称'),c('gender','性别'),c('phone','手机号'),c('user_type','角色'),s('status','状态'),c('created_at','注册时间',170)],form:[i('nickname','昵称',true),sel('gender','性别',[{label:'男',value:'male'},{label:'女',value:'female'},{label:'未设置',value:'unknown'}]),i('phone','手机号'),sel('user_type','用户角色',[{label:'普通用户',value:'user'},{label:'打手',value:'player'}]),sel('status','账号状态',activeOptions)]},
  products:{title:'商品与服务',description:'商品由平台统一编辑，必须绑定审核通过的打手；顾客下单自动交给该打手',status:availabilityOptions,create:true,edit:true,remove:true,columns:[c('id','ID'),img('image','图片'),c('name','名称',180),c('bound_player_id','负责打手ID'),c('category_code','分类'),m('price','售价'),c('stock','库存'),{prop:'is_hot',label:'热门推荐',boolean:true},s('status','状态')],form:[i('name','名称',true),{prop:'bound_player_id',label:'绑定打手',type:'player-single',required:true},{...area('subtitle','商品简介'),help:'显示在小程序商品名称下方；请填写顾客能直接看懂的服务介绍。'},image('image','主图'),area('detail_text','详情文字'),num('price','售价',2),num('stock','库存'),sw('is_hot','热门'),sel('status','状态',availabilityOptions)]},
  orders:{title:'订单管理',description:'严格按合法状态机处理；退款只能在售后管理审核',status:orderOptions,detail:true,edit:true,columns:[c('id','ID'),c('order_no','订单号',190),c('user_id','顾客 UID'),c('contact_phone','联系电话',145),c('product_name','商品',180),c('provider_type','履约类型'),c('provider_user_id','履约用户'),m('total_amount','实付金额'),c('payment_method','支付方式'),c('payment_expires_at','支付到期时间',170),m('platform_fee','平台佣金'),m('provider_income','服务方收入'),s('status','状态'),c('occupied_seconds','接单时长',160),c('created_at','创建时间',170)],form:[sel('status','目标状态',orderTargetOptions),area('note','处理备注')]},
  payments:{title:'支付记录',description:'微信支付与余额支付的结果、交易号和幂等记录只读留痕',status:[{label:'成功',value:'success'},{label:'失败',value:'failed'},{label:'取消',value:'cancelled'},{label:'已退款',value:'refunded'}],columns:[c('id','ID'),c('payment_no','支付单号',190),c('order_id','订单ID'),c('mode','支付方式'),m('amount','金额'),s('status','状态'),c('mock_transaction_no','支付交易号',230),c('created_at','创建时间',170)]},
  applications:{title:'打手入驻审核',description:'身份资料和入驻资格在这里一次审核，通过后才能绑定商品接单',status:reviewOptions,edit:true,detail:true,columns:[c('id','ID'),c('application_type','类型'),c('real_name','联系人'),c('phone','手机号'),c('agreement_version','协议版本',190),c('agreed_at','同意时间',170),s('status','状态'),c('created_at','提交时间',170)],form:[sel('status','审核结果',reviewOptions.slice(1),true,'请选择通过或驳回'),area('review_note','审核备注')]},
  withdrawals:{title:'打手提现打款',description:'先核实并完成实际打款，再填写打款凭证号确认；系统不会自动转账',status:reviewOptions,edit:true,columns:[c('id','ID'),c('withdrawal_no','申请单号',190),c('user_id','用户 UID'),m('amount','金额'),s('status','状态'),c('created_at','申请时间',170),c('transfer_reference','打款凭证号',190)],form:[sel('status','处理结果',[{label:'已实际打款',value:'approved'},{label:'驳回并退回余额',value:'rejected'}],true),i('transfer_reference','打款凭证号',false,'确认已打款时必填'),area('review_note','处理备注')]},
  content:{title:'宣传与内容管理',description:'公告弹窗、首页 Banner、资讯和协议均由后台配置并即时同步',status:activeOptions,create:true,edit:true,remove:true,columns:[c('id','ID'),c('content_type','类型'),c('scene','场景'),img('image','图片'),c('title','标题',200),c('popup_enabled','首页弹出'),c('start_at','开始时间',170),c('end_at','结束时间',170),c('sort_no','排序'),s('status','状态')],form:[sel('content_type','内容类型',[{label:'宣传位',value:'promotion'},{label:'资讯',value:'article'},{label:'文档',value:'document'}]),i('scene','场景',true,'启动公告固定填写 startup'),i('title','标题',true),i('subtitle','副标题'),image('image','图片'),area('body_text','正文/规则',6),i('target_url','跳转地址',false,'公告可填写 /pages/news/detail?id=公告ID&announcement=1'),sw('popup_enabled','首页弹出'),dt('start_at','开始时间'),dt('end_at','结束时间'),area('style_json','样式 JSON',3,'仅填写允许的公告/文字配置 JSON'),num('sort_no','排序'),sel('status','状态',activeOptions)]},
  reviews:{title:'评价管理',description:'评价显示状态会同步到商品详情',status:[{label:'显示',value:'visible'},{label:'隐藏',value:'hidden'}],edit:true,columns:[c('id','ID'),c('order_id','订单ID'),c('rating','评分'),c('content','内容',260),s('status','状态'),c('created_at','时间',170)],form:[sel('status','展示状态',[{label:'显示',value:'visible'},{label:'隐藏',value:'hidden'}])]},
  coupons:{title:'优惠券管理',description:'优惠券库存、发放和使用数量实时同步',status:activeOptions,create:true,edit:true,columns:[c('id','ID'),c('name','名称'),m('amount','面额'),m('min_spend','门槛'),c('total_count','总库存'),c('issued_count','已发放'),c('used_count','已使用'),c('per_user_limit','每人上限'),s('status','状态')],form:[i('name','名称',true),sel('distribution_mode','发放方式',[{label:'指定发放 / 充值赠送',value:'targeted'},{label:'公开领取',value:'public'}],true),{prop:'product_id',label:'适用商品',type:'product-select'},num('amount','面额',2),num('min_spend','使用门槛',2),dt('valid_from','生效时间'),dt('valid_until','失效时间'),num('total_count','发行总数'),num('per_user_limit','每人领取上限'),sel('status','状态',activeOptions)]},
  messages:{title:'消息管理',description:'可向指定用户或全部有效用户发送站内消息',create:true,remove:true,columns:[c('id','ID'),c('user_id','用户 UID'),c('message_type','类型'),c('title','标题'),c('content','内容',260),c('is_read','已读'),c('created_at','发送时间',170)],form:[i('user_id','用户ID',false,'留空则发送给全部有效用户'),sel('message_type','消息类型',[{label:'系统',value:'system'},{label:'订单',value:'order'},{label:'活动',value:'promotion'}]),i('title','标题',true),area('content','内容',5)]},
  players:{title:'打手管理',description:'陪玩档案必须绑定真实小程序账号',status:activeOptions,edit:true,remove:true,columns:[c('id','ID'),c('user_id','用户 UID'),c('phone','手机号',145),img('image','头像'),c('display_name','昵称'),c('gender','性别'),c('city','城市'),c('service_status','服务状态',220),c('occupied_seconds','接单时长',160),c('readiness','接单检查',240),c('current_orders','当前订单'),c('total_income','累计收入'),c('available_balance','可提现'),s('status','状态')],form:[i('user_id','绑定用户 UID',true),i('display_name','昵称',true),sel('gender','性别',[{label:'男',value:'male'},{label:'女',value:'female'}]),num('age','年龄'),i('city','城市'),area('intro','简介'),image('image','头像'),{prop:'voice_url',label:'个人语音',type:'voice'},sw('online_status','在线'),num('sort_no','排序'),sel('status','状态',activeOptions)]},
  categories:{title:'商品分类',description:'商品分类仅用于商品归类和列表筛选，不再控制首页功能入口',status:activeOptions,create:true,edit:true,remove:true,columns:[c('name','分类名称'),c('display_places','前端展示位置',300),c('sort_no','排序'),s('status','状态')],form:[i('name','分类名称',true),num('sort_no','排序'),sel('status','状态',activeOptions)]},
  homeEntries:{title:'首页功能入口',description:'独立管理首页功能名称、干员头像、排序、跳转地址、适用角色和启用状态',status:activeOptions,create:true,edit:true,remove:true,columns:[c('id','ID'),c('entry_code','编码'),c('name','名称'),img('avatar_image','干员头像'),c('icon','回退图标'),c('target_url','跳转地址',240),c('role_scope','适用角色'),c('sort_no','排序'),s('status','状态')],form:[i('entry_code','入口编码',true),i('name','功能名称',true),image('avatar_image','三角洲干员头像'),i('icon','回退SVG图标名',true,'头像未配置时使用'),i('target_url','跳转地址',true,'必须对应 pages.json 中存在的页面'),sel('role_scope','适用角色',[{label:'全部',value:'all'},{label:'普通用户',value:'user'},{label:'陪玩',value:'player'},{label:'商家',value:'merchant'}]),num('sort_no','排序'),sel('status','状态',activeOptions)]},
  couponIssues:{title:'优惠券发放',description:'向一名或多名用户发券；库存、每人上限和幂等由后端事务校验',status:[{label:'可用',value:'active'},{label:'已用完',value:'used'}],create:true,columns:[c('id','ID'),c('user_id','用户 UID'),c('coupon_id','优惠券ID'),c('quantity','发放数量'),c('remaining_count','剩余'),c('source','来源'),s('status','状态'),c('created_at','发放时间',170)],form:[userMulti('user_ids','选择用户'),couponSelect('coupon_id','优惠券'),num('quantity','每人发放数量'),i('idempotency_key','请求幂等编号',true,'同一编号重复提交不会重复发券')]},
  wallets:{title:'钱包总览',description:'查看可用余额、冻结金额、累计收入和累计提现',columns:[c('user_id','用户 UID'),m('balance','可用余额'),m('frozen','冻结金额'),m('total_income','累计收入'),m('total_withdrawn','累计提现'),c('updated_at','更新时间',170)]},
  walletRecords:{title:'钱包流水',description:'结算、冲正、提现冻结和审核均保留前后余额',columns:[c('id','ID'),c('user_id','用户 UID'),c('record_type','类型'),m('amount','变动金额'),m('balance_before','变动前'),m('balance_after','变动后'),m('frozen_after','冻结额'),c('reference_no','业务流水号',210),c('order_id','订单ID'),c('created_at','时间',170)]},
  settlements:{title:'订单结算',description:'每个订单只允许一条结算记录，退款以冲正留痕',status:[{label:'已结算',value:'settled'},{label:'已冲正',value:'reversed'}],columns:[c('id','ID'),c('settlement_no','结算流水号',210),c('order_id','订单ID'),c('provider_user_id','服务方用户'),c('provider_type','角色'),m('gross_amount','实付'),m('platform_fee','平台佣金'),m('provider_income','服务方收入'),s('status','状态'),c('settled_at','结算时间',170)]},
  orderLogs:{title:'订单状态记录',description:'用户、服务方和管理员操作全量留痕',columns:[c('id','ID'),c('order_id','订单ID'),c('from_status','原状态'),c('to_status','新状态'),c('operator_type','操作方'),c('operator_id','操作人'),c('note','备注',220),c('created_at','时间',170)]},
  businessConfig:{title:'业务配置',description:'佣金、自动确认、充值开关和排行榜周期等配置修改后即时生效',edit:true,columns:[c('config_key','配置键',220),c('config_value','配置值'),c('description','说明',300),c('updated_at','更新时间',170)],form:[i('config_key','配置键',true),i('config_value','配置值',true),area('description','说明',3)]},
  rechargeRules:{title:'充值赠券规则',description:'启用即自动赠券；多条达标规则取最高充值门槛的一条，创建充值单时锁定规则，充值确认到账后发放',create:true,edit:true,status:activeOptions,columns:[c('id','ID'),c('name','规则名称'),m('min_amount','充值满'),c('coupon_id','优惠券ID'),c('quantity','赠送张数'),s('status','状态')],form:[i('name','规则名称',true),num('min_amount','充值满（元）',2),couponSelect('coupon_id','赠送优惠券'),num('quantity','赠送张数'),sel('status','开关',activeOptions,true)]},
  rechargeRewards:{title:'充值赠券记录',description:'待发放记录可在补充库存或修正规则对应的优惠券后点击处理补发；重复处理不会重复发券',edit:true,columns:[c('id','ID'),c('recharge_id','充值ID'),c('user_id','顾客ID'),c('coupon_id','优惠券ID'),c('quantity','张数'),s('status','状态'),c('last_error','待补发原因',220),c('issued_at','发放时间',170)],form:[area('note','操作备注')]},
  rechargeOrders:{title:'充值订单',description:'可按用户、手机号、充值单号搜索；查看支付交易号和钱包入账金额',detail:true,status:[{label:'待支付',value:'created'},{label:'成功',value:'success'},{label:'失败',value:'failed'},{label:'已取消',value:'cancelled'}],columns:[c('id','ID'),c('recharge_no','充值单号',210),c('user_id','用户 UID'),c('nickname','用户'),c('phone','手机号'),m('amount','充值金额'),m('bonus_amount','赠送'),m('credited_amount','入账金额'),s('status','状态'),c('mock_transaction_no','支付交易号',240),c('paid_at','支付时间',170),c('created_at','创建时间',170)]},
  rechargeTiers:{title:'充值档位',description:'配置小程序充值中心固定金额和赠送金额',status:activeOptions,create:true,edit:true,remove:true,columns:[c('id','ID'),c('name','档位名称'),m('amount','充值金额'),m('bonus_amount','赠送金额'),c('sort_no','排序'),s('status','状态')],form:[i('name','档位名称',true),num('amount','充值金额',2),num('bonus_amount','赠送金额',2),num('sort_no','排序'),sel('status','状态',activeOptions)]},
  customerConfig:{title:'客服管理',description:'上传微信客服二维码，用户点击首页在线客服后可查看、长按识别；不属于商品分类',status:activeOptions,create:true,edit:true,columns:[c('id','ID'),c('service_name','客服名称'),img('avatar_image','卡通客服头像'),c('online_status','在线状态'),c('contact_text','联系方式',220),img('qr_image','二维码'),s('status','状态')],form:[i('service_name','客服名称',true),image('avatar_image','卡通客服头像'),sel('online_status','在线状态',[{label:'在线',value:'online'},{label:'离线',value:'offline'}],true),i('contact_text','联系方式'),{...image('qr_image','微信客服二维码'),required:true},sel('status','状态',activeOptions)]},
  teenSettings:{title:'账号开启记录',description:'记录哪些账号开启了青少年模式，以及监护密码输错后的锁定情况；不代表已核验年龄。',columns:[c('user_id','用户 UID'),c('enabled','已开启模式'),c('failed_attempts','监护密码错误次数'),c('locked_until','密码锁定至',170),c('updated_at','更新时间',170)]},
  aftersales:{title:'售后管理',description:'仅支持按订单实付金额全额退款；先由服务方处理，超时或授权介入后由平台审核',status:[{label:'待服务方处理',value:'applied'},{label:'服务方同意',value:'provider_approved'},{label:'服务方拒绝',value:'provider_rejected'},{label:'平台审核中',value:'platform_reviewing'},{label:'审核通过',value:'approved'},{label:'已退款',value:'refunded'},{label:'已驳回',value:'rejected'}],detail:true,edit:true,columns:[c('id','ID'),c('aftersale_no','售后单号',200),c('order_id','订单ID'),c('user_id','用户 UID'),c('provider_user_id','服务方'),m('refund_amount','全额退款金额'),c('reason','原因',180),s('status','状态'),c('applied_at','申请时间',170)],form:[sel('action','审核结果',[{label:'通过并全额退款',value:'approve'},{label:'驳回',value:'reject'}],true),area('note','审核说明',4)]},
  receivables:{title:'退款追偿',description:'查看剩余应收和收入抵扣明细；手工核销必须具有独立财务权限并填写原因',status:[{label:'待追偿',value:'outstanding'},{label:'已结清',value:'recovered'}],detail:true,edit:true,columns:[c('id','ID'),c('receivable_no','追偿单号',200),c('provider_user_id','服务方'),c('order_id','订单ID'),c('aftersale_id','售后ID'),m('amount','应收'),m('recovered_amount','已收'),m('remaining_amount','剩余应收'),s('status','状态'),c('created_at','创建时间',170)],form:[num('amount','本次核销金额',2),area('reason','核销原因',4,'',true)]},
  follows:{title:'关注关系',description:'真实关注关系只读对账，不允许后台直接修改计数',columns:[c('id','ID'),c('user_id','用户 UID'),c('shop_id','店铺ID'),c('shop_name','店铺'),c('relation_count','实际关系数'),c('base_fans_count','基础粉丝'),c('display_fans_count','展示粉丝'),c('created_at','关注时间',170)]},
  favorites:{title:'收藏关系',description:'用户与商品收藏关系只读对账',columns:[c('id','ID'),c('user_id','用户 UID'),c('product_id','商品ID'),c('created_at','收藏时间',170)]},
  paymentAudits:{title:'支付处理记录',description:'查看付款发起、微信结果通知和余额扣款的处理过程，用于排查支付失败或重复通知；一筆支付可能有多条记录，不是额外扣款。',columns:[c('id','ID'),c('payment_id','支付ID'),c('order_id','订单ID'),c('user_id','用户 UID'),c('action','处理步骤'),c('result_status','结果'),c('request_id','关联请求号',220),c('created_at','时间',170)]},
  adminAudits:{title:'后台操作记录',description:'记录管理员何时审核、修改或删除了什么，便于追查误操作；仅供查看，不需要日常办理，也不会自动改变订单或资金。',detail:true,columns:[c('id','ID'),c('admin_id','管理员编号'),c('permission_code','操作权限'),c('entity_type','操作对象'),c('entity_id','对象编号'),c('action','操作'),c('reason','原因',180),c('created_at','时间',170)]}
}
// Keep legacy schema fields available to APIs, but do not expose internal identifiers as editable inputs.
definitions.homeEntries.form.find(f=>f.prop==='role_scope').options=homeRoleOptions
definitions.homeEntries.form.find(f=>f.prop==='avatar_image').label='入口图片'
definitions.homeEntries.columns.find(f=>f.prop==='avatar_image').label='入口图片'
definitions.homeEntries.description='设置顾客和打手的首页入口；平台统一经营，不再设置独立商家入口。'
definitions.homeEntries.columns=definitions.homeEntries.columns.filter(c=>!['entry_code','icon'].includes(c.prop))
definitions.homeEntries.columns.find(c=>c.prop==='target_url').label='入口去向'
definitions.homeEntries.form=definitions.homeEntries.form.filter(f=>!['entry_code','icon','target_url'].includes(f.prop))
definitions.homeEntries.form.splice(2,0,sel('target_kind','入口去向',[...homeTargetOptions,{label:'原有页面（保留）',value:'preserve'}],true),{prop:'target_category',label:'商品分类',type:'category-select',required:true})
definitions.products.form.splice(1,0,{prop:'category_code',label:'商品分类',type:'category-select',required:true})
definitions.coupons.remove=true
definitions.coupons.columns.push(c('distribution_mode','发放方式'),c('validity','有效期状态'),c('valid_from','生效时间',170),c('valid_until','失效时间',170))
definitions.coupons.form.find(f=>f.prop==='distribution_mode').options=[{label:'公开领取（顾客自行领取）',value:'public'},{label:'指定发放（选择用户）',value:'targeted'},{label:'充值赠券（配置充值规则）',value:'recharge'}]
definitions.coupons.form.push(userMulti('user_ids','接收用户'),num('quantity','每人发放张数'))
definitions.couponIssues.create=false
definitions.couponIssues.title='优惠券发放记录'
definitions.couponIssues.description='在优惠券页创建公开领取券，或点击指定发放选择顾客；这里保留发放和使用记录。'
definitions.content.form.find(f=>f.prop==='scene').type='select'
definitions.content.form.find(f=>f.prop==='scene').options=sceneOptions
definitions.content.form.find(f=>f.prop==='scene').help='选择内容在小程序显示的位置。'
definitions.content.form.find(f=>f.prop==='target_url').help='可留空；如需跳转，请填写目标页面地址。'
definitions.content.form=definitions.content.form.filter(f=>f.prop!=='style_json')
definitions.content.description='配置首页轮播图、启动公告、资讯和协议内容。'
definitions.businessConfig.title='交易与使用规则'
definitions.businessConfig.description='设置平台抽成、订单确认时限、真实充值开关和排行榜；每项均有用途和单位说明。'
definitions.businessConfig.columns[0].label='设置项目'
definitions.businessConfig.columns[1].label='当前设置'
definitions.businessConfig.form=definitions.businessConfig.form.filter(f=>f.prop!=='description')
definitions.businessConfig.form[0].label='设置项目'
definitions.businessConfig.form[1].label='设置值'
for(const d of Object.values(definitions)){for(const f of [...(d.columns||[]),...(d.form||[])])f.label=f.label.replace(/UID|ID/g,value=>value==='UID'?'UID':'编号').replaceAll('Logo','标志图片').replaceAll('SVG','备用')}
definitions.players.form.find(f=>f.prop==='user_id').readonly=true
definitions.products.columns.find(c=>c.prop==='bound_player_id').label='负责打手'
definitions.couponIssues.form=definitions.couponIssues.form.filter(f=>f.prop!=='idempotency_key')
const config = computed(() => definitions[entity.value] || definitions.users)
const showAllColumns=ref(false),showExtraFields=ref(false),detailTab=ref('logs'),showDetailFields=ref(false),playerNames=reactive({})
const listColumns=computed(()=>showAllColumns.value||!compactColumns[entity.value]?config.value.columns:config.value.columns.filter(c=>compactColumns[entity.value].includes(c.prop)))
const hasExtraFields=computed(()=>(extraFields[entity.value]||[]).some(prop=>prop!=='user_type'&&config.value.form?.some(f=>f.prop===prop)))
const visibleFormFields=computed(()=>(config.value.form||[]).filter(f=>!(entity.value==='products'&&['price','stock'].includes(f.prop))&&!(entity.value==='users'&&f.prop==='user_type')&&!(entity.value==='homeEntries'&&f.prop==='target_category'&&form.target_kind!=='category')&&!(entity.value==='coupons'&&['user_ids','quantity'].includes(f.prop)&&(form.id||form.distribution_mode!=='targeted'))&&(showExtraFields.value||!(extraFields[entity.value]||[]).includes(f.prop))))
const domains={rechargeRules:'coupon',rechargeRewards:'coupon',users:'user',shops:'shop',products:'product',skus:'product',players:'player',playerServices:'player',orders:'order',orderLogs:'order',payments:'order',paymentAudits:'order',aftersales:'aftersale',receivables:'receivable',applications:'application',identities:'identity',withdrawals:'withdrawal',wallets:'wallet',walletRecords:'wallet',settlements:'wallet',content:'content',categories:'content',homeEntries:'content',messages:'content',reviews:'content',coupons:'coupon',couponIssues:'coupon',businessConfig:'finance-config',rechargeTiers:'finance-config',customerConfig:'customer-service',teenSettings:'teen-config',rechargeOrders:'wallet',follows:'shop',favorites:'product',adminAudits:'audit'}
const savePermission=computed(()=>({aftersales:'club:aftersale:review',applications:'club:application:review',identities:'club:identity:review',withdrawals:'club:withdrawal:review',receivables:'club:receivable:writeoff',orders:'club:order:operate'})[entity.value]||`club:${domains[entity.value]||'denied'}:edit`)
const detailPermission=computed(()=>({orders:'club:order:detail',identities:'club:identity:detail',adminAudits:'club:audit:detail'})[entity.value]||`club:${domains[entity.value]||'denied'}:list`)
const deletePermission=computed(()=>`club:${domains[entity.value]||'denied'}:disable`)
const query = reactive({keyword:'',status:String(route.query.status||''),pageNum:1,pageSize:20})
const loading = ref(false), saving = ref(false), rows = ref([]), total = ref(0), form = reactive({}), formRef = ref()
const configNumber=computed({get:()=>Number(form.config_value||0),set:v=>form.config_value=String(v??'')})
const configSelection=computed({get:()=>businessMeta(form.config_key).type==='multi'?String(form.config_value||'').split(',').filter(Boolean):form.config_value,set:v=>form.config_value=Array.isArray(v)?v.join(','):v})
const dialog = reactive({open:false,title:''})
const detail = reactive({open:false,row:null})
const optionLoading = ref(false), userOptions = ref([]), couponOptions = ref([]), playerOptions=ref([]),productOptions=ref([])
const categoryOptions=ref([])
async function loadCategories(){if(!auth.hasPermi('club:content:list'))return;const all=[];let page=1;while(true){const res=await listClubEntity('categories',{pageNum:page,pageSize:100});const items=res.data?.rows||[];all.push(...items.filter(item=>item.code!=='service'));if(!items.length||all.length>=Number(res.data?.total||0))break;page++}categoryOptions.value=all}

function c(prop,label,width){return{prop,label,width}} function s(prop,label){return{prop,label,status:true}} function m(prop,label){return{prop,label,money:true}} function img(prop,label){return{prop,label,image:true,width:90}}
function i(prop,label,required=false,help=''){return{prop,label,type:'input',required,help}} function area(prop,label,rows=4,help='',required=false){return{prop,label,type:'textarea',rows,help,required}} function num(prop,label,precision=0){return{prop,label,type:'number',precision}} function sel(prop,label,options,required=false,placeholder=''){return{prop,label,type:'select',options,required,placeholder}} function sw(prop,label){return{prop,label,type:'switch'}} function image(prop,label){return{prop,label,type:'image'}} function dt(prop,label){return{prop,label,type:'datetime'}}
function userMulti(prop,label){return{prop,label,type:'user-multi',required:true}} function couponSelect(prop,label){return{prop,label,type:'coupon-select',required:true}}

let loadSequence=0
async function load(){const sequence=++loadSequence;const type=entity.value;if(['wallets','walletRecords','wallet-records'].includes(type)){loading.value=false;return}loading.value=true;try{const res=await listClubEntity(type,{...query});if(sequence!==loadSequence)return;const items=(res.data?.rows||[]).map(item=>({...item,_occupiedObservedAt:Date.now()}));rows.value=type==='receivables'?items.map(item=>({...item,remaining_amount:Math.max(0,Number(item.amount||0)-Number(item.recovered_amount||0))})):items;total.value=res.data?.total||0;if(type==='products'&&auth.hasPermi('club:player:list'))await Promise.allSettled([...new Set(items.map(p=>p.bound_player_id).filter(Boolean))].map(async id=>{if(playerNames[id])return;const p=(await getClubEntity('players',id)).data;if(p?.display_name)playerNames[id]=p.display_name}))}finally{if(sequence===loadSequence)loading.value=false}}
function search(){query.pageNum=1;load()}
function reset(){query.keyword='';query.status='';query.pageNum=1;load()}
function clearForm(){showExtraFields.value=false;Object.keys(form).forEach(k=>delete form[k])}
async function openCreate(){await loadFormOptions();clearForm();config.value.form.forEach(f=>{form[f.prop]=f.type==='switch'?false:f.type==='user-multi'?[]:f.type==='number'?0:''});if(entity.value==='customerConfig'){form.service_name='在线客服';form.online_status='online';form.status='active'}if(entity.value==='rechargeRules'){form.quantity=1;form.min_amount=1;form.status='disabled'}if(entity.value==='products'){form.status='active';form.skus=[{name:'默认规格',price:0.01,stock:0,status:'active'}]};if(entity.value==='coupons'){form.distribution_mode='public';form.per_user_limit=1;form.quantity=1;form.status='active';form.valid_from=localDateTime(Date.now());form.valid_until=localDateTime(Date.now()+30*86400000);form.idempotency_key=`coupon-create-${Date.now()}`;await searchUsers('')}if(entity.value==='couponIssues'){form.idempotency_key=`admin-coupon-${Date.now()}`;form.quantity=1;await loadCouponOptions()}dialog.title=`新增${config.value.title}`;dialog.open=true}
async function openEdit(row){if(entity.value==='orders')row={...row,...(await getClubEntity('orders',row.id)).data};if(entity.value==='products'){row={...row,...(await getClubEntity('products',row.id)).data};if(!row.skus?.length)row.skus=[{name:'默认规格',price:Number(row.price)||0.01,stock:0,status:'active'}];row.skus=row.skus.map(s=>({...s,price:Number(s.price),stock:Number(s.stock)}))}await loadFormOptions();clearForm();Object.assign(form,JSON.parse(JSON.stringify(row)));if(entity.value==='homeEntries')Object.assign(form,homeTargetFields(row.target_url));if(entity.value==='orders'){form.originalStatus=row.status;form.status=''}if(entity.value==='identities')form.id=row.user_id;if(entity.value==='receivables'){form.amount=row.remaining_amount;form.reason=''}if(['applications','identities','withdrawals'].includes(entity.value)&&form.status==='pending')form.status='';config.value.form.filter(f=>f.type==='switch').forEach(f=>{form[f.prop]=Boolean(Number(form[f.prop]))});dialog.title=`处理${config.value.title}`;dialog.open=true}
async function openDetail(row){const type=entity.value;const id=row.id??row.user_id;const res=await getClubEntity(type,id);if(type!==entity.value)return;detail.row={...res.data,_occupiedObservedAt:Date.now()};detailTab.value='logs';showDetailFields.value=false;detail.open=true}
async function editFromDetail(){const row=detail.row;await openEdit(row);detail.open=false}
function fieldOptions(field){if(entity.value==='homeEntries'&&field.prop==='target_kind')return (field.options||[]).filter(o=>o.value!=='preserve'||form.target_kind==='preserve');return entity.value==='orders' && field.prop==='status'?targetsFor(form.originalStatus):(field.options||[])}
function displayValue(prop,value,row){if(prop==='occupied_seconds'){if(value==null)return row&&(row.service_status==='busy'||(['accepted','serving'].includes(row.status)&&!row.provider_completed_at))?'时长待同步':'未占用';const seconds=Math.max(0,Math.floor((Number(value)||0)+(row?Math.max(0,(occupancyNow.value-(row._occupiedObservedAt||occupancyNow.value))/1000):0)));return `${Math.floor(seconds/3600)}小时${Math.floor(seconds%3600/60)}分${seconds%60}秒`;}if(value===null||value===undefined||value==='')return '未填写';if(prop==='config_key')return businessMeta(value).label;if(prop==='permission_code')return operatorLabel(value);if(prop==='gender')return stateLabels[value]||'未设置';if(['popup_enabled','is_read','enabled'].includes(prop))return Number(value)?'是':'否';if(/(?:_at|At|Time|valid_from|valid_until|locked_until)$/.test(prop))return formatTime(value);if(/(?:status|type|method|mode)$/.test(prop))return statusLabel(value);if(['scene','source','role_scope','category_code','action'].includes(prop))return operatorLabel(value);return value}
const visibleDetailColumns=computed(()=>{const extra=Object.entries(detailFields[entity.value]||{}).map(([prop,label])=>c(prop,label));const columns=entity.value==='identities'?extra:[...config.value.columns,...extra.filter(item=>!config.value.columns.some(c=>c.prop===item.prop))];return entity.value==='orders'&&!showDetailFields.value?columns.filter(c=>['order_no','product_name','status','occupied_seconds','total_amount','nickname','player_name','contact_name','contact_phone','game_id','game_nickname','created_at','remark'].includes(c.prop)):columns})
const identityEvidence=computed(()=>{try{const value=JSON.parse(detail.row?.identity?.evidenceJson||detail.row?.evidenceJson||'[]');const items=Array.isArray(value)?value:Object.values(value||{});return items.flat().filter(v=>typeof v==='string'&&(/^(https?:\/\/|\/profile\/)/.test(v)))}catch{return []}})
function detailValue(column,value){if(column.prop==='provider_type')return providerLabel(value);if(column.money)return`¥${Number(value||0).toFixed(2)}`;if(column.status)return statusLabel(value);return displayValue(column.prop,value,detail.row)}
async function submit(){if(saving.value)return;if(entity.value==='products'){const error=specificationError(form.skus);if(error){proxy.$modal.msgWarning(error);return}}for(const field of visibleFormFields.value){if(field.required&&!String(form[field.prop]??'').trim()){proxy.$modal.msgWarning(`${field.type==='select'||field.type==='user-multi'?'请选择':'请填写'}${field.label}`);return}}if(entity.value==='coupons'&&(!form.valid_from||!form.valid_until||new Date(form.valid_until)<=new Date(form.valid_from))){proxy.$modal.msgWarning('请设置正确的生效时间和失效时间');return}form.requestId ||= `admin-save-${Date.now()}-${entity.value}-${form.id||'new'}`;saving.value=true;try{const result=await saveClubEntity(entity.value,form);const skipped=result.data?.issuance?.skippedUsers||{};if(Object.keys(skipped).length)proxy.$modal.alertWarning('优惠券已保存，部分顾客未收到：'+Object.entries(skipped).map(([id,why])=>'用户'+id+'：'+why).join('；'));else proxy.$modal.msgSuccess('保存成功');dialog.open=false;load()}finally{saving.value=false}}
async function remove(row){const result=await proxy.$modal.prompt(entity.value==='players'?'撤销资格并允许重新申请，同时下架关联商品。保留用户、资料、历史订单及余额。有未完成业务会拒绝操作。请输入退回原因':entity.value==='coupons'?'删除后停止领取和使用；已发放、已使用及订单记录仍保留。请输入删除原因':'请输入删除或停用原因');const reason=String(result.value||'').trim();if(!reason){proxy.$modal.msgWarning('必须填写操作原因');return}await deleteClubEntity(entity.value,row.id,reason,`admin-delete-${Date.now()}-${row.id}`);proxy.$modal.msgSuccess('操作成功');load()}
function statusLabel(v){return stateLabels[v]||({active:'正常',inactive:'停用',disabled:'停用',unpaid:'待付款',pending:'待处理',accepted:'已接单',serving:'服务中',refunding:'退款中',completed:'已完成',cancelled:'已取消',success:'成功',failed:'失败',refunded:'已退款',partial_refunded:'历史部分退款异常',settled:'已结算',reversed:'已冲正',used:'已用完',applied:'待服务方处理',provider_approved:'服务方同意',provider_rejected:'服务方拒绝',platform_reviewing:'平台审核中',approved:'已通过',rejected:'已驳回',outstanding:'待追偿',recovered:'已结清',protected:'冻结保护中',visible:'显示',hidden:'隐藏',created:'已创建'})[v]||operatorLabel(v)}
function tagType(v){if(['active','success','approved','completed','settled','visible','recovered'].includes(v))return'success';if(['pending','unpaid','serving','refunding','created','applied','provider_approved','platform_reviewing','outstanding','protected'].includes(v))return'warning';if(['failed','rejected','provider_rejected','refunded','partial_refunded','reversed','used','inactive','disabled','cancelled','hidden'].includes(v))return'danger';return'info'}
function assetUrl(url){return clubAssetUrl(url,import.meta.env.VITE_APP_BASE_API)}
async function searchPlayers(keyword){optionLoading.value=true;try{const res=await listClubEntity('players',{keyword,status:'active',pageNum:1,pageSize:100});playerOptions.value=res.data?.rows||[]}finally{optionLoading.value=false}}
async function searchProducts(keyword){const res=await listClubEntity('products',{keyword,pageNum:1,pageSize:100});productOptions.value=res.data?.rows||[]}
async function loadFormOptions(){if(['products','homeEntries'].includes(entity.value))await loadCategories();if(entity.value==='products')await searchPlayers('');if(entity.value==='rechargeRules')await loadCouponOptions();if(['coupons','skus'].includes(entity.value))await searchProducts('')}
async function searchUsers(keyword){optionLoading.value=true;try{const res=await listClubEntity('users',{keyword,status:'active',pageNum:1,pageSize:50});userOptions.value=res.data?.rows||[]}finally{optionLoading.value=false}}
async function loadCouponOptions(){const res=await listClubEntity('coupons',{keyword:'',status:'active',pageNum:1,pageSize:100});couponOptions.value=(res.data?.rows||[]).filter(c=>couponWindow(c)==='有效期内')}
watch(()=>[entity.value,route.query.status],()=>{dialog.open=false;detail.open=false;issueDialog.open=false;showAllColumns.value=false;rows.value=[];total.value=0;query.keyword='';query.status=String(route.query.status||'');query.pageNum=1;load()},{immediate:true})
watch(()=>[entity.value,route.query.orderId],()=>{if(entity.value==='orders'&&/^\d+$/.test(String(route.query.orderId||''))&&auth.hasPermi('club:order:detail'))openDetail({id:Number(route.query.orderId)})},{immediate:true})
watch(entity,()=>{if(['products','homeEntries'].includes(entity.value))loadCategories().catch(()=>{})},{immediate:true})
</script>

<style scoped lang="scss">
.workspace-navigation{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.workspace-navigation :deep(.el-button+.el-button){margin-left:0}.workspace-navigation>strong{margin-right:8px;font-size:20px}.workspace-hint{margin:14px 0 0;color:#64748b;line-height:1.7;font-size:13px}.list-options{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;color:#64748b;font-size:13px}.form-notice{margin-bottom:18px}.club-manage :deep(.el-dialog){max-width:calc(100vw - 32px)}
.club-manage{min-height:calc(100vh - 84px);background:#f4f6fb}.toolbar,.table-card{border:0;border-radius:16px;box-shadow:0 8px 26px rgba(38,53,91,.05)}.toolbar{margin-bottom:18px}.toolbar :deep(.el-card__body){padding-bottom:18px}.context{padding-top:16px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #edf0f5}.context>div{display:flex;flex-direction:column;gap:6px}.context strong{font-size:19px;color:#20283a}.context span,.field-help{color:#8c96aa;font-size:13px}.thumb{width:58px;height:58px;border-radius:10px}.field-help{width:100%;margin-top:6px;line-height:1.5}.table-card :deep(.el-card__body){padding:16px 18px 8px}.detail-json{max-height:420px;margin-top:18px;padding:16px;overflow:auto;border-radius:10px;background:#f6f7fa;white-space:pre-wrap;word-break:break-all}
</style>
