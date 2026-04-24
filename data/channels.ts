import type { Channel } from "@/types/channel"

export const channels: Channel[] = [
  // Filipino Channels
  {
    id: "one-ph",
    name: "One PH",
    url: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/oneph_sd.mpd",
    category: "Filipino",
    accessLevel: "all",
    logo: "https://i.imgur.com/gkluDe9.png",
    isHD: false,
    drm: {
      clearkey: {
        "92834ab4a7e1499b90886c5d49220e46": "a7108d9a6cfcc1b7939eb111daf09ab3",
      },
    },
    description: "One PH - Filipino entertainment channel",
  },
  {
    id: "tv5",
    name: "TV5",
    url: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/tv5_hd.mpd",
    category: "Filipino",
    accessLevel: "all",
    logo: "https://static.wikia.nocookie.net/russel/images/7/7a/TV5_HD_Logo_2024.png",
    isHD: true,
    drm: {
      clearkey: {
        "2615129ef2c846a9bbd43a641c7303ef": "07c7f996b1734ea288641a68e1cfdc4d",
      },
    },
    description: "TV5 HD - Filipino television network",
  },
  {
    id: "a2z",
    name: "A2Z",
    url: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_a2z.mpd",
    category: "Filipino",
    accessLevel: "all",
    logo: "https://static.wikia.nocookie.net/russel/images/8/85/A2Z_Channel_11_without_Channel_11_3D_Logo_2020.png",
    isHD: false,
    drm: {
      clearkey: {
        f703e4c8ec9041eeb5028ab4248fa094: "c22f2162e176eee6273a5d0b68d19530",
      },
    },
    description: "A2Z Channel 11 - Filipino entertainment",
  },
  {
    id: "kapamilya-channel",
    name: "Kapamilya Channel",
    url: "https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01006-abs-cbn-kapcha-dash-abscbnono/index.mpd",
    category: "Filipino",
    accessLevel: "all",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Kapamilya_Channel_logo_%282020%29.svg/1200px-Kapamilya_Channel_logo_%282020%29.svg.png",
    isHD: true,
    drm: {
      clearkey: {
        bd17afb5dc9648a39be79ee3634dd4b8: "3ecf305d54a7729299b93a3d69c02ea5",
      },
    },
    description: "Kapamilya Channel - ABS-CBN entertainment",
  },

  // Movies
  {
    id: "hbo",
    name: "HBO",
    url: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_hbohd.mpd",
    category: "Movies",
    accessLevel: "premium",
    logo: "https://images.now-tv.com/shares/channelPreview/img/en_hk/color/ch115_170_122",
    isHD: true,
    drm: {
      clearkey: {
        d47ebabf7a21430b83a8c4b82d9ef6b1: "54c213b2b5f885f1e0290ee4131d425b",
      },
    },
    description: "HBO - Premium movies and series",
  },
  {
    id: "hbo-hits",
    name: "HBO Hits",
    url: "https://qp-pldt-live-grp-09-prod.akamaized.net/out/u/cg_hbohits.mpd",
    category: "Movies",
    accessLevel: "premium",
    logo: "https://divign0fdw3sv.cloudfront.net/Images/ChannelLogo/contenthub/449_144.png",
    isHD: true,
    drm: {
      clearkey: {
        b04ae8017b5b4601a5a0c9060f6d5b7d: "a8795f3bdb8a4778b7e888ee484cc7a1",
      },
    },
    description: "HBO Hits - Hollywood blockbusters",
  },
  {
    id: "cinemax",
    name: "Cinemax",
    url: "https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_cinemax.mpd",
    category: "Movies",
    accessLevel: "premium",
    logo: "https://divign0fdw3sv.cloudfront.net/Images/ChannelLogo/contenthub/337_144.png",
    isHD: true,
    drm: {
      clearkey: {
        b207c44332844523a3a3b0469e5652d7: "fe71aea346db08f8c6fbf0592209f955",
      },
    },
    description: "Cinemax - Premium movie channel",
  },

  // Kids
  {
    id: "nickelodeon",
    name: "Nickelodeon",
    url: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_nickelodeon.mpd",
    category: "Kids",
    accessLevel: "all",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Nickelodeon_2009_logo.svg/1200px-Nickelodeon_2009_logo.svg.png",
    isHD: false,
    drm: {
      clearkey: {
        "9ce58f37576b416381b6514a809bfd8b": "f0fbb758cdeeaddfa3eae538856b4d72",
      },
    },
    description: "Nickelodeon - Kids entertainment",
  },
  {
    id: "nick-jr",
    name: "Nick Jr",
    url: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_nickjr.mpd",
    category: "Kids",
    accessLevel: "all",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Nick_Jr._logo_2009.svg/1200px-Nick_Jr._logo_2009.svg.png",
    isHD: false,
    drm: {
      clearkey: {
        bab5c11178b646749fbae87962bf5113: "0ac679aad3b9d619ac39ad634ec76bc8",
      },
    },
    description: "Nick Jr - Preschool programming",
  },
  {
    id: "cartoon-network",
    name: "Cartoon Network",
    url: "https://qp-pldt-live-grp-12-prod.akamaized.net/out/u/dr_cartoonnetworkhd.mpd",
    category: "Kids",
    accessLevel: "all",
    logo: "https://poster.starhubgo.com/Linear_channels2/316_1920x1080_HTV.png",
    isHD: true,
    drm: {
      clearkey: {
        a2d1f552ff9541558b3296b5a932136b: "cdd48fa884dc0c3a3f85aeebca13d444",
      },
    },
    description: "Cartoon Network HD - Animated entertainment",
  },
  {
    id: "dreamworks",
    name: "DreamWorks",
    url: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/cg_dreamworks_hd1.mpd",
    category: "Kids",
    accessLevel: "all",
    logo: "https://i.imgur.com/cgfKSDP.png",
    isHD: true,
    drm: {
      clearkey: {
        "4ab9645a2a0a47edbd65e8479c2b9669": "8cb209f1828431ce9b50b593d1f44079",
      },
    },
    description: "DreamWorks HD - Animated movies and shows",
  },

  // Sports
  {
    id: "one-sports",
    name: "One Sports",
    url: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/cg_onesports_hd.mpd",
    category: "Sports",
    accessLevel: "all",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/One_Sports_logo.svg/2560px-One_Sports_logo.svg.png",
    isHD: true,
    drm: {
      clearkey: {
        "53c3bf2eba574f639aa21f2d4409ff11": "3de28411cf08a64ea935b9578f6d0edd",
      },
    },
    description: "One Sports HD - Philippine sports channel",
  },
  {
    id: "ufc",
    name: "UFC (USA)",
    url: "https://linear-893.frequency.stream/dist/xumo/893/hls/master/playlist.m3u8",
    category: "Sports",
    accessLevel: "premium",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/UFC_Logo.svg/1200px-UFC_Logo.svg.png",
    isHD: true,
    drm: {
      clearkey: {
        "15b830e0b73b0b8ef99786121997d5f5": "51646d5e500648c6a4e319c7861e963f",
      },
    },
    description: "UFC - Ultimate Fighting Championship",
  },
  {
    id: "pba-rush",
    name: "PBA RUSH",
    url: "https://qp-pldt-live-grp-01-prod.akamaized.net/out/u/cg_pbarush_hd1.mpd",
    category: "Sports",
    accessLevel: "premium",
    logo: "https://i.imgur.com/F2npB7o.png",
    isHD: true,
    drm: {
      clearkey: {
        "76dc29dd87a244aeab9e8b7c5da1e5f3": "95b2f2ffd4e14073620506213b62ac82",
      },
    },
    description: "PBA RUSH HD - Philippine Basketball Association",
  },
  {
    id: "nba-tv",
    name: "NBA TV Philippines",
    url: "https://qp-pldt-live-grp-02-prod.akamaized.net/out/u/pl_nba.mpd",
    category: "Sports",
    accessLevel: "premium",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/NBA_TV.svg/1200px-NBA_TV.svg.png",
    isHD: true,
    drm: {
      clearkey: {
        f36eed9e95f140fabbc88a08abbeafff: "0125600d0eb13359c28bdab4a2ebe75a",
      },
    },
    description: "NBA TV Philippines - Basketball coverage",
  },
  {
    id: "eurosport-1",
    name: "EUROSPORT 1",
    url: "https://ottb.live.cf.ww.aiv-cdn.net/dub-nitro/live/clients/dash/enc/at8teepvrn/out/v1/ab8d59a847f046c88f07a7f3d115d7fe/cenc.mpd",
    category: "Sports",
    accessLevel: "premium",
    logo: "https://img.favpng.com/14/5/10/eurosport-1-eurosport-2-television-channel-png-favpng-NHSSG8cDpZ10Sbsrh3nu8xUtX.jpg",
    isHD: true,
    drm: {
      clearkey: {
        "15b830e0b73b0b8ef99786121997d5f5": "51646d5e500648c6a4e319c7861e963f",
      },
    },
    description: "EUROSPORT 1 - European sports coverage",
  },

  // News
  {
    id: "cnn-philippines",
    name: "CNN Philippines",
    url: "https://qp-pldt-live-grp-03-prod.akamaized.net/out/u/cg_cnnhd.mpd",
    category: "News",
    accessLevel: "all",
    logo: "https://i.imgur.com/JOg1GGl.png",
    isHD: true,
    drm: {
      clearkey: {
        "900c43f0e02742dd854148b7a75abbec": "da315cca7f2902b4de23199718ed7e90",
      },
    },
    description: "CNN Philippines HD - Local and international news",
  },
  {
    id: "one-news",
    name: "One News",
    url: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/onenews_hd1.mpd",
    category: "News",
    accessLevel: "all",
    logo: "https://i.imgur.com/bpRiu54.png",
    isHD: true,
    drm: {
      clearkey: {
        d39eb201ae494a0b98583df4d110e8dd: "6797066880d344422abd3f5eda41f45f",
      },
    },
    description: "One News HD - Philippine news channel",
  },
  {
    id: "bbc-news",
    name: "BBC News",
    url: "https://qp-pldt-live-grp-04-prod.akamaized.net/out/u/bbcworld_news_sd.mpd",
    category: "News",
    accessLevel: "all",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/BBC_News_2022_%28Alt%29.svg/1200px-BBC_News_2022_%28Alt%29.svg.png",
    isHD: false,
    drm: {
      clearkey: {
        f59650be475e4c34a844d4e2062f71f3: "119639e849ddee96c4cec2f2b6b09b40",
      },
    },
    description: "BBC News - International news coverage",
  },

  // Entertainment
  {
    id: "warner-tv",
    name: "Warner TV",
    url: "https://qp-pldt-live-grp-11-prod.akamaized.net/out/u/dr_warnertvhd.mpd",
    category: "Entertainment",
    accessLevel: "premium",
    logo: "https://i.imgur.com/vGEL2Ne.png",
    isHD: true,
    drm: {
      clearkey: {
        "4503cf86bca3494ab95a77ed913619a0": "afc9c8f627fb3fb255dee8e3b0fe1d71",
      },
    },
    description: "Warner TV HD - Premium entertainment",
  },
  {
    id: "axn",
    name: "AXN",
    url: "https://qp-pldt-live-grp-06-prod.akamaized.net/out/u/cg_axn_sd.mpd",
    category: "Entertainment",
    accessLevel: "premium",
    logo: "http://linear-poster.scum.com.my/prod/logo/AXN_v1.png",
    isHD: false,
    drm: {
      clearkey: {
        fd5d928f5d974ca4983f6e9295dfe410: "3aaa001ddc142fedbb9d5557be43792f",
      },
    },
    description: "AXN - Action entertainment channel",
  },
  {
    id: "axn-hd",
    name: "AXN HD",
    url: "https://linearjitp-playback.scum.com.my/dash-wv/linear/2303/default_ott.mpd",
    category: "Entertainment",
    accessLevel: "premium",
    logo: "http://linear-poster.scum.com.my/prod/logo/AXN_v1.png",
    isHD: true,
    drm: {
      clearkey: {
        c24a7811d9ab46b48b746a0e7e269210: "c321afe1689b07d5b7e55bd025c483ce",
      },
    },
    description: "AXN HD - Action entertainment channel in high definition",
  },

  // PPV
  {
    id: "ppv-298",
    name: "PPV 298",
    url: "https://qp-pldt-live-grp-07-prod.akamaized.net/out/u/ppvhd298.mpd",
    category: "PPV",
    accessLevel: "premium",
    logo: "https://i.imgur.com/placeholder-ppv.png",
    isHD: true,
    drm: {
      clearkey: {
        "0f873dc6412b11edb8780242ac120002": "7511efa4f5f1f82fe61776ba3b49fc10",
      },
    },
    description: "PPV 298 - Pay-per-view channel",
  },
]
