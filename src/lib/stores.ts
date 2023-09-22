import { writable, derived, type Writable } from 'svelte/store'

export const paused = writable(true)
export const loading = writable(true)
export const track: Writable<Track> = writable()
export const tracks: Writable<Array<Track>> = writable([])
export const cuedTran: Writable<Transition | null> = writable(null)
export const loadingTran: Writable<Transition | null> = writable(null)
export const mode = writable('short')

