<template>
  <div class="application-container">
    <div class="head-container">
      <div>
        <a
          href="https://github.com/light0x00/parser-generator"
          target="_blank"
          style="display:block;align-self:flex-end"
        >
          <img
            width="60"
            alt="GitHub Logomark"
            src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
          />
        </a>
      </div>
      <div style="display:flex;flex-direction:column;">
        <h1 style="margin: 0;line-height:1.1;">Parser Generator Web Tools</h1>
        <p style="font-size:14px;margin:0;color:#909399;align-self:flex-start;">powered by light0x00</p>
      </div>
    </div>

    <router-view class="content-container" />

  </div>
</template>

<script lang="js">
export default {

};
</script>

<style>
.center {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    /* height: fill-available; */
}
.el-row {
    margin: 5px 0;
}
.application-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.head-container {
    display: flex;
    align-items: center;
}
.content-container {
    overflow: hidden;
}

@media (min-width: 2000px) {
    .content-container {
        width: 50%;
    }
}

@media (min-width: 1400px) and (max-width: 2000px) {
    .content-container {
        width: 70%;
    }
}

@media (max-width: 1400px) {
    .content-container {
        width: 100%;
    }
}
</style>