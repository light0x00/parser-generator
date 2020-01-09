<template>
  <table>
    <slot name="head" />
    <tr v-for="(row,rowIndex) of data" :key="rowIndex">
      <td v-for="(cell,cellIndex) of row " :key="cellIndex">{{ cell }}</td>
    </tr>
  </table>
</template>

<script>
export default {
	name: "matrix-table",
	props: { data: { type: Array, required: true } }
};
</script>

<style>

</style>