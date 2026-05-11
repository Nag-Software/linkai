import { after } from 'next/server'

export function runAfterResponse(label: string, task: () => Promise<unknown> | unknown) {
  after(async () => {
    try {
      await task()
    } catch (error) {
      console.error(`[BackgroundTask] ${label} failed:`, error)
    }
  })
}