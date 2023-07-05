# luci-app-v2ray

Luci support for V2Ray V5 / Xray

**This branch is the LuCI for OpenWrt 22.03 and later with firewall4 based on [luci-app-v2ray by kuoruan](https://github.com/kuoruan/luci-app-v2ray/tree/master) .**

**The gfwlist update script is based on [gfwlist2dnsmasq by cokebar](https://github.com/cokebar/gfwlist2dnsmasq)**

## Install

1. Download ipk files from [release](https://github.com/wordsworthless/luci-app-v2ray/releases) page

2. Upload files to your router

3. Install package with opkg:

```sh
opkg install luci-app-v2ray_*.ipk
```

Dependencies:

- jshn
- ip (ip-tiny or ip-full)
- nftables-json
- kmod-nft-tproxy
- kmod-nft-socket
- resolveip
- coreutils-base64
- curl
- dnsmasq-full v2.87 or later (with nftset built-in)

For translations, please install ```luci-i18n-v2ray-*```.

> You may need to remove ```dnsmasq``` before installing this package.

## Configure

1. Download Core file from v2fly/xtls release
> - [V2Ray Core](https://github.com/v2fly/v2ray-core/releases)
> - [Xray Core](https://github.com/xtls/xray-core/releases).
>
>  For those who are used to manipulate traffics with the built-in routing module, you might as well need to download the asset files
> - [V2fly domain-list-community](https://github.com/v2fly/domain-list-community/releases)
> - [LoyalSoldier v2ray-rules-dat](https://github.com/Loyalsoldier/v2ray-rules-dat/releases)

2. Upload Core (and asset) files to your router

3. Config Core (and asset) files path in LuCI page.

4. Add your inbound and outbound rules.

5. Enable the service via LuCI.

## Build

Package files is in branch [luci2](https://github.com/wordsworthless/luci-app-v2ray/tree/luci2)

Download with Git:

```sh
git clone -b luci2 https://github.com/wordsworthless/luci-app-v2ray.git luci-app-v2ray
```
