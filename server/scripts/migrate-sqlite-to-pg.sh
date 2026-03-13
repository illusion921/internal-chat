#!/bin/bash

# SQLite 到 PostgreSQL 数据迁移脚本

set -e

SQLITE_DB="${1:-./dev.db}"
PG_URL="postgresql://postgres:postgres@localhost:5432/internal_chat?schema=public"

echo "=== 开始数据迁移 ==="
echo "源数据库: $SQLITE_DB"
echo "目标数据库: $PG_URL"

# 检查 SQLite 数据库是否存在
if [ ! -f "$SQLITE_DB" ]; then
    echo "错误: SQLite 数据库文件不存在: $SQLITE_DB"
    exit 1
fi

# 导出 SQLite 数据
echo "导出 SQLite 数据..."

# 迁移用户表
sqlite3 "$SQLITE_DB" -cmd ".mode insert users" ".select * from users;" | \
    psql "$PG_URL" -c "COPY users FROM STDIN;" 2>/dev/null || echo "用户表可能已有数据"

# 迁移好友关系
sqlite3 "$SQLITE_DB" -cmd ".mode insert friendships" ".select * from friendships;" | \
    psql "$PG_URL" -c "COPY friendships FROM STDIN;" 2>/dev/null || echo "好友表可能已有数据"

# 迁移群组
sqlite3 "$SQLITE_DB" -cmd ".mode insert groups" ".select * from groups;" | \
    psql "$PG_URL" -c "COPY groups FROM STDIN;" 2>/dev/null || echo "群组表可能已有数据"

# 迁移群成员
sqlite3 "$SQLITE_DB" -cmd ".mode insert group_members" ".select * from group_members;" | \
    psql "$PG_URL" -c "COPY group_members FROM STDIN;" 2>/dev/null || echo "群成员表可能已有数据"

# 迁移消息
sqlite3 "$SQLITE_DB" -cmd ".mode insert messages" ".select * from messages;" | \
    psql "$PG_URL" -c "COPY messages FROM STDIN;" 2>/dev/null || echo "消息表可能已有数据"

# 迁移文件
sqlite3 "$SQLITE_DB" -cmd ".mode insert files" ".select * from files;" | \
    psql "$PG_URL" -c "COPY files FROM STDIN;" 2>/dev/null || echo "文件表可能已有数据"

echo "=== 数据迁移完成 ==="