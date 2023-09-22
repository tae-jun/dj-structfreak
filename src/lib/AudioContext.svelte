<script context="module" lang="ts">
  import { onDestroy } from "svelte"
  import { get } from "svelte/store"
  import { browser } from "$app/environment"
  import { paused, tracks, cuedTran, loadingTran, mode } from "$lib/stores"
  import { S3_BASE } from "./config"

  export let audioCtx: AudioContext

  let trackSource: AudioBufferSourceNode | null = null
  let nextSource: AudioBufferSourceNode | null = null
  let tranSource: AudioBufferSourceNode | null = null

  let trackAudioBuffers: AudioBuffer[] = []
  // let trackAudioBuffer: AudioBuffer | null = null
  let tranAudioBuffer: AudioBuffer | null = null
  // let nextAudioBuffer: AudioBuffer | null = null

  // let cuedTran: Transition

  let startTime: number = 0
  let offsetTime: number = 0
  let tranStartTime: number = 0
  let nextStartTime: number = 0

  // let sources: AudioBufferSourceNode[] = []
  // let gainNodes: GainNode[] = []
  // let audioBuffers: AudioBuffer[] = []

  if (browser) {
    audioCtx = new AudioContext()

    paused.subscribe((paused) => {
      if (paused) {
        pausePlaying()
      } else {
        startPlaying()
      }
    })

    tracks.subscribe((tracks) => {
      console.log("tracks updated", tracks, trackAudioBuffers)
    })

    mode.subscribe(async (mode) => {
      if (get(tracks).length === 0) return
      await cueTran()
    })
  }

  export async function loadTrack(trackId: string) {
    const url = `${S3_BASE}/info/` + trackId.replace(/\.mp3$/g, ".json.gz")
    const res = await fetch(url)
    const newTrack: Track = await res.json()

    const trackUrl = `${S3_BASE}/track/${trackId}`
    const newTrackAudioBuffer = await loadAudioBuffer(trackUrl)
    newTrack.duration = newTrackAudioBuffer.duration

    tracks.update((tracks) => {
      if (tracks.length > 1) {
        trackAudioBuffers.pop()
        tracks.pop()
      }
      tracks.push(newTrack)
      trackAudioBuffers.push(newTrackAudioBuffer)
      return tracks
    })

    // if (get(tracks).length > 1) {
    //   tracks.update((tracks) => {
    //     tracks.pop()
    //     return tracks
    //   })
    //   await tick()
    // }

    // tracks.update((tracks) => {
    //   tracks.push(newTrack)
    //   return tracks
    // })

    console.log("trackLoaded", newTrack)

    return newTrack
  }

  async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url, { cache: "force-cache" })
    const arrayBuffer = await response.arrayBuffer()
    return await audioCtx.decodeAudioData(arrayBuffer)
  }

  function destroySource(source: AudioBufferSourceNode | null) {
    if (source) {
      source.onended = null
      source.disconnect()
    }
  }

  function destroyAllSources() {
    destroySource(trackSource)
    destroySource(nextSource)
    destroySource(tranSource)
  }

  function startPlaying() {
    destroySource(trackSource)

    trackSource = audioCtx.createBufferSource()
    trackSource.buffer = trackAudioBuffers[0]
    trackSource.connect(audioCtx.destination)
    trackSource.start(0, offsetTime)

    startTime = audioCtx.currentTime

    paused.set(false)
  }

  function pausePlaying() {
    destroySource(trackSource)

    offsetTime += audioCtx.currentTime - startTime // Add elapsed time to offset
    paused.set(true)
  }

  export function getPlaybackTime(trackIndex: number = 0): number {
    if (trackIndex === 0) {
      if (get(paused)) {
        return offsetTime
      } else {
        return offsetTime + (audioCtx.currentTime - startTime)
      }
    } else {
      const tran = get(cuedTran) as Transition
      if (!tran) return 0 // in loading state
      if (getPlaybackTime(0) < tran.start) {
        return tran.next_start - tran.duration
      } else {
        return tran.next_start - tran.duration + (getPlaybackTime(0) - tran.start)
      }
    }
  }

  export function seekTo(timeInSeconds: number) {
    const _cuedTran = get(cuedTran)
    if (_cuedTran && timeInSeconds > _cuedTran.start) {
      console.log("seekTo", timeInSeconds, "in transition")
      uncue()
    }

    // Set the new offset
    offsetTime = timeInSeconds

    startPlaying()
    recue()
  }

  export async function cue(tran: Transition) {
    if (get(tracks).length > 1) {
      uncue()
    }

    loadingTran.set(tran)

    try {
      const tranAudioUrl = `${S3_BASE}/tran/${tran.tran_id}.mp3`

      cuedTran.set(tran)

      // Load simultaneously
      const [_tranAudioBuffer, _] = await Promise.all([
        loadAudioBuffer(tranAudioUrl),
        loadTrack(tran.next_track_id),
      ])
      tranAudioBuffer = _tranAudioBuffer

      recue()
    } finally {
      loadingTran.set(null)
    }
  }

  export function recue() {
    const _cuedTran = get(cuedTran)
    if (!_cuedTran) return

    destroyCuedSources()

    tranSource = audioCtx.createBufferSource()
    tranSource.buffer = tranAudioBuffer
    tranSource.connect(audioCtx.destination)
    tranSource.onended = onTransitionEnd

    nextSource = audioCtx.createBufferSource()
    nextSource.buffer = trackAudioBuffers[1]
    nextSource.connect(audioCtx.destination)

    if (!get(paused)) {
      const diff = _cuedTran.start - getPlaybackTime()

      if (diff < 0) {
        // The selected transition is in the past. Play it immediately after 10ms.
        tranStartTime = 0.01 + audioCtx.currentTime
        nextStartTime = 0.01 + _cuedTran.duration + audioCtx.currentTime
        offsetTime = _cuedTran.start
        startTime = 0.01 + audioCtx.currentTime
      } else {
        tranStartTime = diff + audioCtx.currentTime
        nextStartTime = _cuedTran.end_tsm - getPlaybackTime() + audioCtx.currentTime
      }
      console.log("tranStartTime", tranStartTime)
      console.log("nextStartTime", nextStartTime)

      trackSource?.stop(tranStartTime)
      tranSource.start(tranStartTime)
      nextSource.start(nextStartTime, _cuedTran.next_start)
    }

    console.log(get(tracks), trackAudioBuffers)
  }

  export function uncue() {
    cuedTran.set(null)
    destroyCuedSources()

    tracks.update((tracks) => {
      tracks.pop()
      trackAudioBuffers.pop()
      return tracks
    })
  }

  function destroyCuedSources() {
    destroySource(tranSource)
    destroySource(nextSource)
  }

  export async function onTransitionEnd() {
    await moveToNext()
  }

  export async function moveToNext() {
    destroySource(trackSource)

    trackSource = nextSource
    trackAudioBuffers.shift()
    tracks.update((tracks) => {
      tracks.shift()
      return tracks
    })

    tranSource = null
    nextSource = null

    const tran = get(cuedTran) as Transition
    startTime = nextStartTime
    offsetTime = tran.next_start

    await cueTran()
  }

  export async function cueTran() {
    const _mode = get(mode)
    if (_mode === "manual") {
      // Do nothing
    } else if (_mode === "short") {
      const firstTran = get(tracks)[0].trans.find(
        (tran) => tran.start > getPlaybackTime()
      ) as Transition
      await cue(firstTran)
    } else if (_mode === "long") {
      const lastTran = get(tracks)[0].trans.slice(-1)[0]
      await cue(lastTran)
    } else if (_mode === "random") {
      const trans = get(tracks)[0].trans.filter((tran) => tran.start > getPlaybackTime())
      const randomIndex = Math.floor(Math.random() * trans.length)
      const randomTran = trans[randomIndex]
      await cue(randomTran)
    }
  }
</script>

<script lang="ts">
  onDestroy(() => {
    destroyAllSources()
  })
</script>
