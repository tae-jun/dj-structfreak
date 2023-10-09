<script lang="ts">
  import { onMount } from "svelte"
  import { paused, cuedTran, loadingTran } from "$lib/stores"
  import { getPlaybackTime, seekTo, cue } from "./AudioContext.svelte"
  import { COLOR } from "./config"
  import { slide } from "svelte/transition"
  import { expoInOut } from "svelte/easing"

  export let track: Track
  export let trackIndex: number

  let energy: Energy = track.energy.nav
  let trans: Array<Transition> = track.trans
  let duration: number = track.duration

  let tranXs: Array<number> = []
  let tranWidths: Array<number> = []

  let width: number
  let energyWidth: number
  let energyHeight: number
  let timingWidth: number
  let timingHeight: number
  let dpr: number
  let frames: number
  let isMounted: boolean = false

  let wrapper: HTMLDivElement
  let energyCanvas: HTMLCanvasElement
  let tranCanvas: HTMLCanvasElement
  let timebarCanvas: HTMLCanvasElement

  $: if (!$paused) drawTimebar()

  onMount(() => {
    dpr = window.devicePixelRatio || 1
    isMounted = true

    draw()
    drawTimebar()
  })

  function draw() {
    frames = energy.low.length - 1

    const rectEnergy = energyCanvas.getBoundingClientRect()
    energyWidth = energyCanvas.width = rectEnergy.width * dpr
    energyHeight = energyCanvas.height = rectEnergy.height * dpr

    const rectTiming = timebarCanvas.getBoundingClientRect()
    timingWidth = timebarCanvas.width = rectTiming.width * dpr
    timingHeight = timebarCanvas.height = rectTiming.height * dpr

    const rectTran = tranCanvas.getBoundingClientRect()
    tranCanvas.width = rectTran.width * dpr
    tranCanvas.height = rectTran.height * dpr

    const rect = wrapper.getBoundingClientRect()
    width = rect.width

    tranXs = trans.map((tran) => {
      return Math.round((tran.start / duration) * width)
    })

    tranWidths = trans.map((tran) => {
      return Math.round(((tran.end - tran.start) / duration) * width)
    })

    drawEnergy(energy.high, COLOR.NAV_HIGH)
    drawEnergy(energy.mid, COLOR.NAV_MID)
    drawEnergy(energy.low, COLOR.NAV_LOW)
  }

  function drawEnergy(eg: Array<number>, color: string) {
    const ctx = energyCanvas.getContext("2d") as CanvasRenderingContext2D
    const points = eg.map((v, i) => {
      const x = (i / frames) * energyWidth
      const y = (v / 255) * energyHeight
      return [x, y]
    })

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, energyHeight)
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(points[i][0], energyHeight - points[i][1])
    }
    ctx.stroke()

    // Fill the area under the line graph
    ctx.lineTo(points[points.length - 1][0], energyHeight)
    ctx.lineTo(points[0][1], energyHeight)
    ctx.closePath()
    ctx.fill()
  }

  function drawTimebar() {
    if (!timebarCanvas) return
    if (!$paused) requestAnimationFrame(drawTimebar)

    const x = (getPlaybackTime(trackIndex) / duration) * energyWidth
    const ctx = timebarCanvas.getContext("2d") as CanvasRenderingContext2D
    timebarCanvas.width = energyWidth
    timebarCanvas.height = energyHeight

    ctx.strokeStyle = "white"
    ctx.lineWidth = dpr * 1.5
    ctx.clearRect(0, 0, energyWidth, energyHeight)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, energyHeight)
    ctx.stroke()
  }

  async function onClick(event: MouseEvent) {
    if (trackIndex !== 0) return

    console.log("click", event.target, event)

    const rect = wrapper.getBoundingClientRect()
    const position = (duration * event.offsetX) / rect.width
    // const position = (duration * event.clientX) / rect.width

    // Check if the position is within a transition
    const transition = trans.find((tran) => position >= tran.start && position <= tran.end)
    if (transition) {
      // Do nothing.
    } else {
      console.log(`Clicked on position ${position}`)
      seekTo(position)
    }
  }

  async function onTransitionClick(event: MouseEvent, tran: Transition, i: number) {
    if ($cuedTran === tran) return
    await cue(tran)
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div id="navigator" class="relative h-10 w-full" bind:this={wrapper}>
  <canvas class="absolute h-full w-full" bind:this={tranCanvas} />

  {#if trackIndex === 0}
    <div class="absolute h-full w-full">
      {#each trans as tran, i}
        {#if $loadingTran === tran}
          <div
            class="absolute h-full bg-white rounded animate-ping"
            style="left: {tranXs[i]}px; width: {tranWidths[i]}px;"
          />
        {/if}
        <div
          class="absolute h-full bg-opacity-30 rounded"
          class:bg-white={tran !== $cuedTran}
          class:bg-rose-500={tran === $cuedTran}
          class:bg-opacity-80={tran === $cuedTran}
          class:animate-pulse={tran === $cuedTran}
          style="left: {tranXs[i]}px; width: {tranWidths[i]}px;"
        />
      {/each}
    </div>
  {/if}

  <canvas id="energy-canvas" class="absolute h-full w-full py-2" bind:this={energyCanvas} />

  <canvas class="absolute h-full w-full" bind:this={timebarCanvas} />

  {#if trackIndex === 0}
    {#if $cuedTran}
      <div
        class="absolute h-full backdrop-grayscale"
        style="
        left: {Math.ceil(($cuedTran.end / duration) * width)}px;
        width: {Math.round((1 - $cuedTran.end / duration) * width)}px;
      "
        transition:slide={{ axis: "x", duration: 1000, easing: expoInOut }}
      />
    {/if}

    <div class="absolute h-full w-full" on:mousedown={onClick}>
      {#each trans as tran, i}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="absolute h-full cursor-pointer rounded hover:backdrop-brightness-150"
          style="left: {tranXs[i]}px; width: {tranWidths[i]}px;"
          on:click={(event) => onTransitionClick(event, tran, i)}
          on:mousedown={(event) => event.stopPropagation()}
        />
      {/each}
    </div>
  {:else if $cuedTran}
    <div
      class="absolute h-full backdrop-grayscale"
      style="
    left: 0px;
    width: {Math.round(($cuedTran.next_start / duration) * width)}px;
  "
      transition:slide={{ axis: "x", duration: 1000, easing: expoInOut }}
    />
  {/if}
</div>

<svelte:window on:resize={draw} />
