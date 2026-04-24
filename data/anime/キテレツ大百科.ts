export interface Episode {
  id: string
  number: number
  title: string
  url: string
  isExternal: boolean
  m3u8Url?: string
  logo?: string
}

export const kiteretsuEpisodes: Episode[] = [
  {
    id: "kiteretsu-ep1",
    number: 1,
    title: "Episode 1",
    url: "https://player.mux.com/O5worBYhqLYmJSs7panLXGIk4Mrb9vHx0000SfJQLZ6a4",
    isExternal: true,
    m3u8Url: "https://stream.mux.com/O5worBYhqLYmJSs7panLXGIk4Mrb9vHx0000SfJQLZ6a4.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Animax_logo.svg/1200px-Animax_logo.svg.png",
  },
  {
    id: "kiteretsu-ep2and3",
    number: 2,
    title: "Episode 2 and 3",
    url: "https://player.mux.com/HDKZx6ObtVGYmFqVpta9qSUfdrUlNeooZZirUy2b5iU",
    isExternal: true,
    m3u8Url: "https://stream.mux.com/HDKZx6ObtVGYmFqVpta9qSUfdrUlNeooZZirUy2b5iU.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Animax_logo.svg/1200px-Animax_logo.svg.png",
  },
  {
    id: "kiteretsu-ep4",
    number: 3,
    title: "Episode 4",
    url: "https://player.mux.com/yLCa7gRbfeaURNL8lcr5Vx36Ps9ePdmkTvwt4gjuJZU",
    isExternal: true,
    m3u8Url: "https://stream.mux.com/yLCa7gRbfeaURNL8lcr5Vx36Ps9ePdmkTvwt4gjuJZU.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Animax_logo.svg/1200px-Animax_logo.svg.png",
  },
  {
    id: "kiteretsu-ep5",
    number: 4,
    title: "Episode 5",
    url: "https://player.mux.com/Wt1Mo02uL8Ta4C02Ojwm6H9gTVoiTrLm3RT3qTfW0001yFM",
    isExternal: true,
    m3u8Url: "https://stream.mux.com/Wt1Mo02uL8Ta4C02Ojwm6H9gTVoiTrLm3RT3qTfW0001yFM.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Animax_logo.svg/1200px-Animax_logo.svg.png",
  },
  {
    id: "kiteretsu-ep6and7",
    number: 5,
    title: "Episode 6 and 7",
    url: "https://player.mux.com/oXDuetfcArjX02RFxxvTcWx6ykVDGvTyzfEpHsUIkiXc",
    isExternal: true,
    m3u8Url: "https://stream.mux.com/oXDuetfcArjX02RFxxvTcWx6ykVDGvTyzfEpHsUIkiXc.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Animax_logo.svg/1200px-Animax_logo.svg.png",
  },
  {
    id: "kiteretsu-ep8to10",
    number: 6,
    title: "Episode 8, 9 and 10",
    url: "https://player.mux.com/4r6FRfnSaQjijDeFuV6pNKcFH3201AgH26g253WfS00hQ",
    isExternal: true,
    m3u8Url: "https://stream.mux.com/4r6FRfnSaQjijDeFuV6pNKcFH3201AgH26g253WfS00hQ.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Animax_logo.svg/1200px-Animax_logo.svg.png",
  },
]
