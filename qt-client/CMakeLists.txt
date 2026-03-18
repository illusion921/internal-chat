cmake_minimum_required(VERSION 3.16)
project(InternalChat VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# 查找 Qt6
find_package(Qt6 REQUIRED COMPONENTS 
    Core 
    Gui 
    Widgets 
    Network 
    WebSockets
)

# 源文件
set(SOURCES
    src/main.cpp
    src/mainwindow.cpp
    src/mainwindow.h
    src/loginwidget.cpp
    src/loginwidget.h
    src/chatwidget.cpp
    src/chatwidget.h
    src/contactwidget.cpp
    src/contactwidget.h
    src/api/apiclient.cpp
    src/api/apiclient.h
    src/models/models.h
    src/models/models.cpp
    resources/resources.qrc
)

# 可执行文件
add_executable(${PROJECT_NAME} ${SOURCES})

# 链接 Qt 库
target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Network
    Qt6::WebSockets
)

# 包含目录
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/api
    ${CMAKE_CURRENT_SOURCE_DIR}/src/models
)

# Windows 下隐藏控制台窗口
if(WIN32)
    set_target_properties(${PROJECT_NAME} PROPERTIES
        WIN32_EXECUTABLE TRUE
    )
endif()

# 安装规则
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)

# 复制资源
install(DIRECTORY resources/
    DESTINATION bin/resources
)