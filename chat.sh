#!/bin/bash
# Internal Chat 服务管理脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVICES=("internal-chat-server" "internal-chat-web")

print_status() {
    echo -e "${YELLOW}=== Internal Chat 服务状态 ===${NC}"
    for svc in "${SERVICES[@]}"; do
        status=$(systemctl --user is-active "$svc" 2>/dev/null || echo "inactive")
        if [ "$status" = "active" ]; then
            echo -e "$svc: ${GREEN}$status${NC}"
        else
            echo -e "$svc: ${RED}$status${NC}"
        fi
    done
}

start_services() {
    echo -e "${GREEN}启动服务...${NC}"
    systemctl --user start internal-chat-server.service
    systemctl --user start internal-chat-web.service
    echo -e "${GREEN}服务已启动${NC}"
    print_status
}

stop_services() {
    echo -e "${YELLOW}停止服务...${NC}"
    systemctl --user stop internal-chat-web.service 2>/dev/null || true
    systemctl --user stop internal-chat-server.service 2>/dev/null || true
    echo -e "${YELLOW}服务已停止${NC}"
    print_status
}

restart_services() {
    echo -e "${YELLOW}重启服务...${NC}"
    systemctl --user restart internal-chat-server.service
    systemctl --user restart internal-chat-web.service
    echo -e "${GREEN}服务已重启${NC}"
    print_status
}

enable_services() {
    echo -e "${GREEN}设置开机自启...${NC}"
    systemctl --user enable internal-chat-server.service
    systemctl --user enable internal-chat-web.service
    echo -e "${GREEN}已设置开机自启${NC}"
}

disable_services() {
    echo -e "${YELLOW}取消开机自启...${NC}"
    systemctl --user disable internal-chat-server.service 2>/dev/null || true
    systemctl --user disable internal-chat-web.service 2>/dev/null || true
    echo -e "${YELLOW}已取消开机自启${NC}"
}

view_logs() {
    echo -e "${YELLOW}=== 服务日志 (Ctrl+C 退出) ===${NC}"
    journalctl --user -u internal-chat-server.service -u internal-chat-web.service -f
}

case "${1:-status}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        print_status
        ;;
    enable)
        enable_services
        ;;
    disable)
        disable_services
        ;;
    logs)
        view_logs
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|enable|disable|logs}"
        exit 1
        ;;
esac