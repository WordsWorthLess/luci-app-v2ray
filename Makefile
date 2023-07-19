#
# Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
# Licensed to the public under the MIT License.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-v2ray
PKG_VERSION:=2.1.4
PKG_RELEASE:=1

PKG_LICENSE:=MIT
PKG_MAINTAINER:=Xingwang Liao <kuoruan@gmail.com>

LUCI_TITLE:=LuCI support for V2Ray & Xray
LUCI_DEPENDS:=+jshn +ip +resolveip +dnsmasq-full +curl +coreutils-base64 +(ipset||kmod-nft-socket) \
	+(iptables-mod-tproxy||kmod-nft-tproxy) +(iptables-mod-extra||kmod-nft-fib)
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/conffiles
/etc/config/v2ray
/etc/v2ray/transport.json
/etc/v2ray/directlist.txt
/etc/v2ray/proxylist.txt
endef

include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/postinst
#!/bin/sh

if [ -z "$${IPKG_INSTROOT}" ] ; then
	( . /etc/uci-defaults/40_luci-v2ray ) && rm -f /etc/uci-defaults/40_luci-v2ray

	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache/

	killall -HUP rpcd 2>/dev/null
fi

chmod 755 "$${IPKG_INSTROOT}/etc/init.d/v2ray" >/dev/null 2>&1
chmod 755 "$${IPKG_INSTROOT}/usr/share/v2ray/update_lists.sh" >/dev/null 2>&1
ln -sf "../init.d/v2ray" \
	"$${IPKG_INSTROOT}/etc/rc.d/S99v2ray" >/dev/null 2>&1

if [ -n "$$(cat $${IPKG_INSTROOT}/etc/passwd | grep luci_app_v2ray)" ] ; then
	sed -i 's/luci_app_v2ray:x:[0-9]\{1,6\}:/luci_app_v2ray:x:0:/g' $${IPKG_INSTROOT}/etc/passwd
fi

exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh

if [ -s "$${IPKG_INSTROOT}/etc/rc.d/S99v2ray" ] ; then
	rm -f "$${IPKG_INSTROOT}/etc/rc.d/S99v2ray"
fi

if [ -z "$${IPKG_INSTROOT}" ] ; then
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache/
fi

exit 0
endef

# call BuildPackage - OpenWrt buildroot signature
