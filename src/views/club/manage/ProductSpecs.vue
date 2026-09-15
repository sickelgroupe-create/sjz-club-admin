<template>
  <section class="product-specifications">
    <h3>服务规格与价格</h3>
    <p>价格由平台统一设置。顾客选择具体规格下单；已有规格可停用，历史订单不受影响。</p>
    <div v-for="(sku,index) in modelValue" :key="sku.id || 'new-'+index" class="specification">
      <el-input v-model="sku.name" maxlength="100" placeholder="规格名称，例如：一小时陪玩" aria-label="规格名称"/>
      <div class="specification-values">
        <label>售价（元）<el-input-number v-model="sku.price" :min="0.01" :max="99999999.99" :precision="2" :controls="false" aria-label="规格售价"/></label>
        <label>可售数量<el-input-number v-model="sku.stock" :min="0" :max="2147483647" :precision="0" :controls="false" aria-label="规格库存"/></label>
        <el-switch v-model="sku.status" active-value="active" inactive-value="inactive" active-text="启用" inactive-text="停用"/>
        <el-button v-if="!sku.id && modelValue.length>1" link type="danger" @click="remove(index)">移除</el-button>
      </div>
    </div>
    <el-button :disabled="modelValue.length>=100" @click="add">添加服务规格</el-button>
  </section>
</template>
<script setup>
const props=defineProps({modelValue:{type:Array,default:()=>[]}})
const emit=defineEmits(['update:modelValue'])
function add(){emit('update:modelValue',[...props.modelValue,{name:'',price:0.01,stock:0,status:'active'}])}
function remove(index){emit('update:modelValue',props.modelValue.filter((_,i)=>i!==index))}
</script>
<style scoped>
.product-specifications{border-top:1px solid #e8edf3;margin-top:20px;padding-top:8px}.product-specifications p{color:#606266;line-height:1.7}.specification{padding:14px;margin-bottom:12px;background:#f6f8fb;border-radius:8px}.specification-values{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-top:12px}.specification-values label{display:flex;flex-direction:column;gap:6px}.specification-values :deep(.el-input-number){width:132px}
</style>
