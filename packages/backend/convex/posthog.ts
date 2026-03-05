import { PostHog } from 'posthog-node'

export const posthog = new PostHog(
    'phc_Eg1WmAo9rYJfbI3V46iDdWyC6setYTdu6aj8fJmkp6F',
    {
        host: 'https://us.i.posthog.com',
        flushAt: 1,
        flushInterval: 0
    }
)
