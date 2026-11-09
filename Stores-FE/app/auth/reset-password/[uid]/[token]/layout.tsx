// Cloudflare Pages (next-on-pages) runs every server-rendered route on the Edge runtime. The page is a client
// component and cannot export this itself, so the segment config lives here.
export const runtime = 'edge'

export default function ResetPasswordTokenLayout({ children }: { children: React.ReactNode }) {
    return children
}
