<script lang="ts">
  import { RadioGroup, RadioItem } from "@skeletonlabs/skeleton"
  import Icon from "@iconify/svelte"
  import Navigator from "$lib/Navigator.svelte"
  import AudioContext, { loadTrack } from "$lib/AudioContext.svelte"
  import { onMount } from "svelte"
  import { tracks, mode, paused } from "$lib/stores.js"
  import { slide } from "svelte/transition"
  import { S3_BASE } from "$lib/config"

  // const trackId = "002.+Post+Malone+-+Sunflower.mp3"
  // const trackId = "003.+The+Kid+LAROI+-+STAY.mp3"
  // const trackId = "008.+Khalid+-+Talk.mp3"
  // const trackId = "01.+The+Weeknd+-+Blinding+Lights.mp3"
  const trackId = "009.+Travis+Scott+-+SICKO+MODE.mp3"
  // const trackId = "60.+Amine%CC%81+-+Caroline.mp3"
  // const trackId = "052.+Joji+-+Glimpse+of+Us.mp3"

  onMount(async () => {
    await loadTrack(trackId)
  })
</script>

<!-- YOU CAN DELETE EVERYTHING IN THIS PAGE -->

<!-- <div class="container h-full mx-auto flex justify-center items-center my-10">
  <div class="space-y-5">
    <h1 class="h1">DJ StructFreak got music structure embedddings! 😱</h1>
  </div>
</div> -->

<div class="h-full w-full mx-auto flex flex-col items-center py-10 space-y-10">
  <div>
    <h1 class="h1">DJ StructFreak 🤖</h1>
  </div>

  <div class="h-full w-full flex flex-col justify-center items-center">
    <div class="h-32 w-full px-2 space-y-4">
      {#if $tracks.length > 0}
        {#each $tracks as t, i (t.track_id)}
          <div class="w-full flex flex-row" transition:slide>
            <img
              src={S3_BASE + "/cover/" + t.track_id.replace(/\.mp3$/g, ".jpg")}
              class="h-16 w-16 mr-1.5 rounded"
            />
            <div class="w-full h-16 pt-0.5">
              <Navigator track={t} trackIndex={i} />

              <div class="flex flex-row">
                <h6 class="h6">{t.title}</h6>
                <h6 class="h6 ml-1.5 text-slate-400">
                  {t.artist.replaceAll(";", ", ")}
                </h6>
              </div>
            </div>
          </div>
        {/each}
      {/if}
      <AudioContext />
    </div>
  </div>

  <div class="flex flex-row">
    <button
      type="button"
      class="btn text-lg variant-ghost-surface mr-2"
      on:click={() => ($paused = !$paused)}
    >
      {#if $paused}
        <Icon icon="ph:play" />
      {:else}
        <Icon icon="ph:pause" />
      {/if}
    </button>

    <RadioGroup>
      <RadioItem bind:group={$mode} name="mode" value="short">Hot Mix</RadioItem>
      <RadioItem bind:group={$mode} name="mode" value="long">Long Mix</RadioItem>
      <RadioItem bind:group={$mode} name="mode" value="random">Random Mix</RadioItem>
      <RadioItem bind:group={$mode} name="mode" value="manual">Manual</RadioItem>
    </RadioGroup>
  </div>
</div>
