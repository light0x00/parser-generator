<template>
  <details open>
    <summary>
      <slot name="head" style="display:inline;margin:0px"></slot>
    </summary>
    <slot name="body"></slot>
  </details>
</template>

<script>

export default {
};
</script>

<style scoped>
summary {
	display: flex;
    align-items: center;
	font-size: 28px;
	cursor: pointer;
}
</style>