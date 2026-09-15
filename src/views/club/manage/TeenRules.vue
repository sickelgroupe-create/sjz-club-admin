<template>
  <el-card shadow="never" class="teen-rules">
    <h3>青少年模式：限制规则</h3>
    <el-alert title="用户主动开启，后台配置限制" description="用户在小程序主动开启青少年模式后，才应用下方后台设置的规则。未开启的账号和未登录访客不受本模式限制；目前没有经过核验的顾客年龄判断流程，不能据此保证拦截某个年龄以下的用户。" type="warning" :closable="false" show-icon />
    <p>下方是实际生效的规则；账号开启情况在本页下方单独记录。限制规则与账号记录不是同一个开关。</p>
    <template v-if="canRead">
      <el-alert v-if="error" :title="error" type="error" :closable="false"/><el-button v-if="error" @click="load">重新加载</el-button>
      <el-table v-else v-loading="loading" :data="rules">
        <el-table-column label="限制项目" min-width="190"><template #default="{row}">{{businessMeta(row.config_key).label}}</template></el-table-column>
        <el-table-column label="当前设置" min-width="230"><template #default="{row}">{{businessValue(row.config_key,row.config_value)}}</template></el-table-column>
        <el-table-column label="作用说明" min-width="320"><template #default="{row}">{{businessMeta(row.config_key).help}}</template></el-table-column>
        <el-table-column v-if="canEdit" label="操作" width="80"><template #default="{row}"><el-button link type="primary" @click="edit(row)">修改</el-button></template></el-table-column>
      </el-table>
      <p>可见内容中未选的类别不允许浏览；使用时段外也受限制。消费上限填零表示不限额，不能代替“禁止下单”和“禁止充值”开关。</p>
    </template>
    <p v-else>当前账号没有查看限制规则的权限，请由拥有“交易规则”权限的管理员查看和修改。</p>
    <el-dialog v-model="opened" title="修改青少年限制规则" width="560px" append-to-body>
      <h4>{{meta.label}}</h4><p>{{meta.help}}</p>
      <el-switch v-if="meta.type==='switch'" v-model="draft.config_value" active-value="1" inactive-value="0" active-text="开启" inactive-text="关闭"/>
      <el-select v-else-if="meta.type==='multi'" v-model="selection" multiple placeholder="选择允许浏览的内容" style="width:100%"><el-option v-for="o in meta.options" :key="o.value" :value="o.value" :label="o.label"/></el-select>
      <el-time-picker v-else-if="meta.type==='time'" v-model="draft.config_value" format="HH:mm" value-format="HH:mm"/>
      <el-input-number v-else v-model="amount" :min="meta.min" :max="meta.max" :precision="2"/>
      <template #footer><el-button @click="opened=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存规则</el-button></template>
    </el-dialog>
  </el-card>
</template>
<script setup>
import {ref,computed,onMounted} from 'vue'
import auth from '@/plugins/auth'
import {listClubEntity,saveClubEntity} from '@/api/club'
import {businessMeta,businessValue} from '@/utils/club-operator-labels.mjs'
import {ElMessage} from 'element-plus'
const canRead=auth.hasPermi('club:finance-config:list'),canEdit=auth.hasPermi('club:finance-config:edit')
const rules=ref([]),loading=ref(false),error=ref(''),opened=ref(false),saving=ref(false),draft=ref({})
const meta=computed(()=>businessMeta(draft.value.config_key))
const amount=computed({get:()=>Number(draft.value.config_value||0),set:v=>draft.value.config_value=String(v??'')})
const selection=computed({get:()=>String(draft.value.config_value||'').split(',').filter(Boolean),set:v=>draft.value.config_value=v.join(',')})
async function load(){if(!canRead)return;loading.value=true;error.value='';try{const res=await listClubEntity('businessConfig',{keyword:'teen_',pageNum:1,pageSize:100});rules.value=(res.data?.rows||[]).filter(r=>r.config_key.startsWith('teen_'));if(!rules.value.length)error.value='尚未读取到青少年限制规则，请联系管理员检查配置。'}catch{error.value='限制规则加载失败，不能将空白视为没有限制。'}finally{loading.value=false}}
function edit(row){draft.value={...row,requestId:'teen-rule-'+Date.now()};opened.value=true}
async function save(){if(!canEdit||saving.value)return;if(!String(draft.value.config_value??'').trim()){ElMessage.warning('请选择允许浏览的内容或填写有效设置');return}saving.value=true;try{await saveClubEntity('businessConfig',draft.value);ElMessage.success('规则已保存');opened.value=false;await load()}finally{saving.value=false}}
onMounted(load)
</script>
<style scoped>
.teen-rules{margin-bottom:18px;border:0;border-radius:16px}.teen-rules p{color:#64748b;line-height:1.7;font-size:14px}.teen-rules h3{margin-top:0}
</style>
