#include "chatwidget.h"
#include "contactwidget.h"
#include "api/apiclient.h"
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <QStackedLayout>
#include <QListWidgetItem>
#include <QTextEdit>
#include <QScrollBar>
#include <QMessageBox>
#include <QJsonDocument>
#include <QJsonObject>
#include <QDateTime>
#include <QInputDialog>

ChatWidget::ChatWidget(QWidget *parent)
    : QWidget(parent)
    , m_webSocket(new QWebSocket())
    , m_reconnectTimer(new QTimer(this))
{
    setupUi();
    setupWebSocket();
    
    m_reconnectTimer->setInterval(5000);
    connect(m_reconnectTimer, &QTimer::timeout, this, &ChatWidget::connectSocket);
}

ChatWidget::~ChatWidget()
{
    disconnectSocket();
    delete m_webSocket;
}

void ChatWidget::setCurrentUser(const User &user)
{
    m_currentUser = user;
    m_userNameLabel->setText(user.nickname);
    
    // 连接 WebSocket
    connectSocket();
    
    // 加载会话列表
    loadConversations();
}

void ChatWidget::setupUi()
{
    QHBoxLayout *mainLayout = new QHBoxLayout(this);
    mainLayout->setSpacing(0);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    
    // 左侧导航栏
    QWidget *navWidget = new QWidget(this);
    navWidget->setObjectName("navWidget");
    navWidget->setFixedWidth(64);
    navWidget->setStyleSheet("#navWidget { background: #2e2e2e; }");
    
    QVBoxLayout *navLayout = new QVBoxLayout(navWidget);
    navLayout->setSpacing(8);
    navLayout->setContentsMargins(0, 20, 0, 10);
    
    // 用户头像
    m_userAvatarLabel = new QLabel(navWidget);
    m_userAvatarLabel->setFixedSize(40, 40);
    m_userAvatarLabel->setStyleSheet("background: #07c160; border-radius: 4px;");
    m_userAvatarLabel->setAlignment(Qt::AlignCenter);
    m_userAvatarLabel->setText("👤");
    m_userAvatarLabel->setCursor(Qt::PointingHandCursor);
    
    m_userNameLabel = new QLabel(navWidget);
    m_userNameLabel->setAlignment(Qt::AlignCenter);
    m_userNameLabel->setStyleSheet("color: #999; font-size: 11px;");
    
    navLayout->addWidget(m_userAvatarLabel, 0, Qt::AlignHCenter);
    navLayout->addWidget(m_userNameLabel, 0, Qt::AlignHCenter);
    navLayout->addSpacing(30);
    
    // 导航按钮
    m_chatBtn = new QPushButton("💬", navWidget);
    m_chatBtn->setObjectName("navBtn");
    m_chatBtn->setFixedSize(40, 40);
    m_chatBtn->setCursor(Qt::PointingHandCursor);
    m_chatBtn->setToolTip("消息");
    m_chatBtn->setStyleSheet("QPushButton#navBtn { background: transparent; border: none; border-radius: 4px; font-size: 18px; }"
                             "QPushButton#navBtn:hover { background: rgba(255,255,255,0.1); }"
                             "QPushButton#navBtn:checked { background: rgba(7,193,96,0.2); }");
    m_chatBtn->setCheckable(true);
    m_chatBtn->setChecked(true);
    
    m_contactBtn = new QPushButton("👥", navWidget);
    m_contactBtn->setObjectName("navBtn");
    m_contactBtn->setFixedSize(40, 40);
    m_contactBtn->setCursor(Qt::PointingHandCursor);
    m_contactBtn->setToolTip("联系人");
    m_contactBtn->setCheckable(true);
    m_contactBtn->setStyleSheet(m_chatBtn->styleSheet());
    
    navLayout->addWidget(m_chatBtn, 0, Qt::AlignHCenter);
    navLayout->addWidget(m_contactBtn, 0, Qt::AlignHCenter);
    
    navLayout->addStretch();
    
    // 设置和退出
    m_settingsBtn = new QPushButton("⚙️", navWidget);
    m_settingsBtn->setObjectName("navBtn");
    m_settingsBtn->setFixedSize(40, 40);
    m_settingsBtn->setCursor(Qt::PointingHandCursor);
    m_settingsBtn->setToolTip("设置");
    m_settingsBtn->setStyleSheet(m_chatBtn->styleSheet());
    
    m_logoutBtn = new QPushButton("🚪", navWidget);
    m_logoutBtn->setObjectName("navBtn");
    m_logoutBtn->setFixedSize(40, 40);
    m_logoutBtn->setCursor(Qt::PointingHandCursor);
    m_logoutBtn->setToolTip("退出登录");
    m_logoutBtn->setStyleSheet(m_chatBtn->styleSheet());
    
    navLayout->addWidget(m_settingsBtn, 0, Qt::AlignHCenter);
    navLayout->addWidget(m_logoutBtn, 0, Qt::AlignHCenter);
    
    mainLayout->addWidget(navWidget);
    
    // 会话列表
    QWidget *listWidget = new QWidget(this);
    listWidget->setObjectName("listWidget");
    listWidget->setFixedWidth(280);
    listWidget->setStyleSheet("#listWidget { background: #e9e9e9; border-right: 1px solid #d9d9d9; }");
    
    QVBoxLayout *listLayout = new QVBoxLayout(listWidget);
    listLayout->setSpacing(0);
    listLayout->setContentsMargins(0, 0, 0, 0);
    
    // 搜索框
    QLineEdit *searchEdit = new QLineEdit(listWidget);
    searchEdit->setPlaceholderText("搜索");
    searchEdit->setFixedHeight(36);
    searchEdit->setStyleSheet("QLineEdit { background: #d4d4d4; border: none; border-radius: 4px; padding: 0 10px; margin: 10px; }");
    listLayout->addWidget(searchEdit);
    
    // 会话列表
    m_conversationList = new QListWidget(listWidget);
    m_conversationList->setStyleSheet("QListWidget { background: transparent; border: none; }"
                                      "QListWidget::item { background: transparent; border-bottom: 1px solid transparent; padding: 10px; }"
                                      "QListWidget::item:hover { background: #dcdcdc; }"
                                      "QListWidget::item:selected { background: #c9c9c9; }");
    m_conversationList->setVerticalScrollMode(QAbstractItemView::ScrollPerPixel);
    listLayout->addWidget(m_conversationList);
    
    m_emptyLabel = new QLabel("暂无会话", listWidget);
    m_emptyLabel->setAlignment(Qt::AlignCenter);
    m_emptyLabel->setStyleSheet("color: #999;");
    m_emptyLabel->hide();
    listLayout->addWidget(m_emptyLabel);
    
    mainLayout->addWidget(listWidget);
    
    // 右侧内容区
    QWidget *contentWidget = new QWidget(this);
    contentWidget->setObjectName("contentWidget");
    contentWidget->setStyleSheet("#contentWidget { background: #f5f5f5; }");
    
    QVBoxLayout *contentLayout = new QVBoxLayout(contentWidget);
    contentLayout->setSpacing(0);
    contentLayout->setContentsMargins(0, 0, 0, 0);
    
    // 欢迎页
    m_welcomeWidget = new QWidget(contentWidget);
    QLabel *welcomeLabel = new QLabel("选择一个会话开始聊天", m_welcomeWidget);
    welcomeLabel->setAlignment(Qt::AlignCenter);
    welcomeLabel->setStyleSheet("color: #999; font-size: 16px;");
    QVBoxLayout *welcomeLayout = new QVBoxLayout(m_welcomeWidget);
    welcomeLayout->addWidget(welcomeLabel);
    
    // 聊天页
    m_messageWidget = new QWidget(contentWidget);
    QVBoxLayout *messageLayout = new QVBoxLayout(m_messageWidget);
    messageLayout->setSpacing(0);
    messageLayout->setContentsMargins(0, 0, 0, 0);
    
    // 聊天标题栏
    QWidget *headerWidget = new QWidget(m_messageWidget);
    headerWidget->setFixedHeight(50);
    headerWidget->setStyleSheet("background: #fff; border-bottom: 1px solid #e8e8e8;");
    QHBoxLayout *headerLayout = new QHBoxLayout(headerWidget);
    m_chatTitleLabel = new QLabel(headerWidget);
    m_chatTitleLabel->setStyleSheet("font-size: 15px; font-weight: bold;");
    headerLayout->addWidget(m_chatTitleLabel);
    headerLayout->addStretch();
    messageLayout->addWidget(headerWidget);
    
    // 消息显示区
    m_messageDisplay = new QTextEdit(m_messageWidget);
    m_messageDisplay->setReadOnly(true);
    m_messageDisplay->setStyleSheet("QTextEdit { background: #f5f5f5; border: none; padding: 10px; }");
    messageLayout->addWidget(m_messageDisplay);
    
    // 输入区
    QWidget *inputWidget = new QWidget(m_messageWidget);
    inputWidget->setFixedHeight(120);
    inputWidget->setStyleSheet("background: #fff; border-top: 1px solid #e8e8e8;");
    QVBoxLayout *inputLayout = new QVBoxLayout(inputWidget);
    inputLayout->setContentsMargins(10, 10, 10, 10);
    
    // 输入框
    m_inputEdit = new QLineEdit(inputWidget);
    m_inputEdit->setPlaceholderText("输入消息...");
    m_inputEdit->setStyleSheet("QLineEdit { background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 4px; padding: 8px; }");
    connect(m_inputEdit, &QLineEdit::returnPressed, this, &ChatWidget::onSendClicked);
    inputLayout->addWidget(m_inputEdit);
    
    // 发送按钮
    QHBoxLayout *btnLayout = new QHBoxLayout();
    btnLayout->addStretch();
    m_sendBtn = new QPushButton("发送", inputWidget);
    m_sendBtn->setFixedSize(80, 32);
    m_sendBtn->setCursor(Qt::PointingHandCursor);
    m_sendBtn->setStyleSheet("QPushButton { background: #07c160; color: white; border: none; border-radius: 4px; }"
                             "QPushButton:hover { background: #06ad56; }"
                             "QPushButton:pressed { background: #059b4c; }");
    connect(m_sendBtn, &QPushButton::clicked, this, &ChatWidget::onSendClicked);
    btnLayout->addWidget(m_sendBtn);
    inputLayout->addLayout(btnLayout);
    
    messageLayout->addWidget(inputWidget);
    
    // 堆叠布局
    m_chatStack = new QStackedWidget(contentWidget);
    m_chatStack->addWidget(m_welcomeWidget);
    m_chatStack->addWidget(m_messageWidget);
    contentLayout->addWidget(m_chatStack);
    
    // 联系人页
    m_contactWidget = new ContactWidget(contentWidget);
    m_chatStack->addWidget(m_contactWidget);
    
    mainLayout->addWidget(contentWidget);
    
    // 连接信号
    connect(m_conversationList, &QListWidget::itemClicked, this, &ChatWidget::onConversationClicked);
    connect(m_chatBtn, &QPushButton::clicked, [this]() {
        m_chatBtn->setChecked(true);
        m_contactBtn->setChecked(false);
        m_chatStack->setCurrentIndex(0);
    });
    connect(m_contactBtn, &QPushButton::clicked, [this]() {
        m_chatBtn->setChecked(false);
        m_contactBtn->setChecked(true);
        m_chatStack->setCurrentWidget(m_contactWidget);
    });
    connect(m_logoutBtn, &QPushButton::clicked, [this]() {
        if (QMessageBox::question(this, "退出登录", "确定要退出登录吗？") == QMessageBox::Yes) {
            disconnectSocket();
            emit logoutRequested();
        }
    });
}

void ChatWidget::setupWebSocket()
{
    connect(m_webSocket, &QWebSocket::connected, this, &ChatWidget::onConnected);
    connect(m_webSocket, &QWebSocket::disconnected, this, &ChatWidget::onDisconnected);
    connect(m_webSocket, &QWebSocket::textMessageReceived, this, &ChatWidget::onTextMessageReceived);
    connect(m_webSocket, &QWebSocket::errorOccurred, this, &ChatWidget::onSocketError);
}

void ChatWidget::connectSocket()
{
    if (m_webSocket->state() == QAbstractSocket::ConnectedState) {
        return;
    }
    
    // 构建 WebSocket URL
    QString baseUrl = ApiClient::instance()->baseUrl();
    baseUrl.replace("http://", "ws://").replace("https://", "wss://");
    baseUrl.remove("/api");
    
    QString token = ApiClient::instance()->token();
    QString wsUrl = QString("%1?token=%2").arg(baseUrl).arg(token);
    
    m_webSocket->open(QUrl(wsUrl));
}

void ChatWidget::disconnectSocket()
{
    m_reconnectTimer->stop();
    if (m_webSocket->state() == QAbstractSocket::ConnectedState) {
        m_webSocket->close();
    }
}

void ChatWidget::onConnected()
{
    m_reconnectTimer->stop();
    qDebug() << "WebSocket connected";
}

void ChatWidget::onDisconnected()
{
    qDebug() << "WebSocket disconnected";
    // 自动重连
    if (!m_reconnectTimer->isActive()) {
        m_reconnectTimer->start();
    }
}

void ChatWidget::onTextMessageReceived(const QString &message)
{
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    if (doc.isNull()) return;
    
    QJsonObject json = doc.object();
    QString event = json["event"].toString();
    
    if (event == "message:new") {
        Message msg = Message::fromJson(json["data"].toObject());
        if (msg.conversationId == m_currentConversation.id) {
            appendMessage(msg);
        }
        // TODO: 更新会话列表
    }
}

void ChatWidget::onSocketError(QAbstractSocket::SocketError error)
{
    Q_UNUSED(error)
    qDebug() << "WebSocket error:" << m_webSocket->errorString();
}

void ChatWidget::loadConversations()
{
    ApiClient::instance()->getConversations([this](bool success, const QJsonArray &data) {
        if (success) {
            m_conversations.clear();
            m_conversationList->clear();
            
            for (const QJsonValue &val : data) {
                Conversation conv = Conversation::fromJson(val.toObject());
                m_conversations.append(conv);
                
                QListWidgetItem *item = new QListWidgetItem();
                item->setText(conv.targetName);
                item->setData(Qt::UserRole, conv.id);
                
                if (conv.unreadCount > 0) {
                    item->setText(QString("%1 (%2)").arg(conv.targetName).arg(conv.unreadCount));
                }
                
                m_conversationList->addItem(item);
            }
            
            m_emptyLabel->setVisible(data.isEmpty());
        }
    });
}

void ChatWidget::loadMessages()
{
    if (m_currentConversation.id.isEmpty()) return;
    
    ApiClient::instance()->getMessages(m_currentConversation.id, 1, 50, [this](bool success, const QJsonObject &data) {
        if (success) {
            m_messages.clear();
            m_messageDisplay->clear();
            
            QJsonArray messages = data["list"].toArray();
            for (const QJsonValue &val : messages) {
                Message msg = Message::fromJson(val.toObject());
                m_messages.append(msg);
                appendMessage(msg);
            }
            
            // 滚动到底部
            QScrollBar *scrollBar = m_messageDisplay->verticalScrollBar();
            scrollBar->setValue(scrollBar->maximum());
        }
    });
}

void ChatWidget::onConversationClicked(QListWidgetItem *item)
{
    QString conversationId = item->data(Qt::UserRole).toString();
    
    for (const Conversation &conv : m_conversations) {
        if (conv.id == conversationId) {
            m_currentConversation = conv;
            break;
        }
    }
    
    m_chatTitleLabel->setText(m_currentConversation.targetName);
    m_chatStack->setCurrentWidget(m_messageWidget);
    
    loadMessages();
}

void ChatWidget::onSendClicked()
{
    QString content = m_inputEdit->text().trimmed();
    if (content.isEmpty()) return;
    
    sendMessage(content, "text");
    m_inputEdit->clear();
}

void ChatWidget::sendMessage(const QString &content, const QString &msgType)
{
    if (m_webSocket->state() != QAbstractSocket::ConnectedState) {
        QMessageBox::warning(this, "提示", "连接已断开，正在重连...");
        return;
    }
    
    QJsonObject msg;
    msg["event"] = "message:send";
    msg["data"] = QJsonObject{
        {"conversationId", m_currentConversation.id},
        {"conversationType", m_currentConversation.type},
        {"msgType", msgType},
        {"content", content}
    };
    
    m_webSocket->sendTextMessage(QJsonDocument(msg).toJson());
}

void ChatWidget::appendMessage(const Message &message)
{
    QString time = message.createdAt.toString("hh:mm");
    QString sender = message.senderNickname;
    QString content = message.content;
    
    if (message.msgType == "image") {
        content = "[图片]";
    } else if (message.msgType == "file") {
        content = "[文件]";
    }
    
    QString html = QString("<div style='margin: 8px 0;'>"
                          "<span style='color: #999; font-size: 12px;'>%1</span> "
                          "<span style='font-weight: bold;'>%2:</span> "
                          "<span>%3</span>"
                          "</div>")
                   .arg(time).arg(sender).arg(content);
    
    m_messageDisplay->append(html);
}

QString ChatWidget::generateConversationId(const QString &targetId, const QString &type)
{
    if (type == "private") {
        QStringList ids = { m_currentUser.id, targetId };
        std::sort(ids.begin(), ids.end());
        return QString("private_%1_%2").arg(ids[0], ids[1]);
    } else {
        return QString("group_%1").arg(targetId);
    }
}