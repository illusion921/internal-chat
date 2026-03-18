# 内网聊天 Qt 客户端

跨平台 Qt 桌面客户端，支持 Windows、Linux 和 macOS。

## 技术栈

- Qt 6.x (Widgets、Network、WebSockets)
- C++17
- CMake 3.16+

## 功能特性

- 用户登录/注册
- 私聊/群聊
- 好友管理
- 群组管理
- 实时消息推送 (WebSocket)
- 文件传输

## 构建要求

### 通用要求

- CMake 3.16+
- C++17 编译器
- Qt 6.2+ (需要以下模块: Core, Gui, Widgets, Network, WebSockets)

### Linux

```bash
# Ubuntu/Debian
sudo apt install build-essential cmake qt6-base-dev qt6-websockets-dev

# Arch Linux
sudo pacman -S base-devel cmake qt6-base qt6-websockets

# Fedora
sudo dnf install gcc-c++ cmake qt6-qtbase-devel qt6-qtwebsockets-devel
```

### Windows

1. 安装 Visual Studio 2019+ (包含 C++ 工具)
2. 安装 Qt 6.x (通过在线安装器或 vcpkg)
3. 安装 CMake

### macOS

```bash
brew install cmake qt
```

## 构建

### Linux/macOS

```bash
mkdir build && cd build
cmake ..
make -j$(nproc)
```

### Windows (Visual Studio)

```cmd
mkdir build && cd build
cmake .. -G "Visual Studio 17 2022"
cmake --build . --config Release
```

### Windows (MinGW)

```cmd
mkdir build && cd build
cmake .. -G "MinGW Makefiles"
mingw32-make -j%NUMBER_OF_PROCESSORS%
```

## 运行

构建完成后，可执行文件位于 `build/` 目录：

```bash
./InternalChat
```

## 打包发布

### Linux (AppImage)

```bash
# 安装 linuxdeploy
wget https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage
chmod +x linuxdeploy-x86_64.AppImage

# 打包
./linuxdeploy-x86_64.AppImage --appdir AppDir --executable build/InternalChat --output appimage
```

### Windows

使用 NSIS 或 Inno Setup 创建安装程序。

### macOS

使用 `macdeployqt` 工具：

```bash
macdeployqt InternalChat.app -dmg
```

## 配置

首次运行时，在登录界面点击设置按钮配置服务器地址：

```
http://192.168.1.39:3002
```

## 项目结构

```
qt-client/
├── CMakeLists.txt          # CMake 构建配置
├── src/
│   ├── main.cpp            # 程序入口
│   ├── mainwindow.h/cpp    # 主窗口
│   ├── loginwidget.h/cpp   # 登录界面
│   ├── chatwidget.h/cpp    # 聊天界面
│   ├── contactwidget.h/cpp # 联系人界面
│   ├── api/
│   │   └── apiclient.h/cpp # API 客户端
│   └── models/
│       └── models.h/cpp    # 数据模型
└── resources/
    ├── resources.qrc       # Qt 资源文件
    └── styles/
        └── style.qss       # 样式表
```

## 开发说明

### API 客户端

所有 API 请求通过 `ApiClient` 单例类处理：

```cpp
// 登录
ApiClient::instance()->login(username, password, [](bool success, const QJsonObject &data) {
    if (success) {
        // 登录成功
    }
});

// 获取好友列表
ApiClient::instance()->getFriends([](bool success, const QJsonArray &data) {
    // 处理好友数据
});
```

### WebSocket 消息

WebSocket 用于实时消息推送：

```cpp
// 发送消息
QJsonObject msg;
msg["event"] = "message:send";
msg["data"] = QJsonObject{
    {"conversationId", conversationId},
    {"msgType", "text"},
    {"content", "Hello"}
};
m_webSocket->sendTextMessage(QJsonDocument(msg).toJson());
```

## 许可证

MIT License