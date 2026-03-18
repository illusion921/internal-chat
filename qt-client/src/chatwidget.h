#ifndef CHATWIDGET_H
#define CHATWIDGET_H

#include <QWidget>
#include <QListWidget>
#include <QStackedWidget>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QWebSocket>
#include <QTimer>
#include "models/models.h"

class ContactWidget;
class QTextEdit;

class ChatWidget : public QWidget
{
    Q_OBJECT

public:
    explicit ChatWidget(QWidget *parent = nullptr);
    ~ChatWidget();
    
    void setCurrentUser(const User &user);

signals:
    void logoutRequested();

private slots:
    void onConversationClicked(QListWidgetItem *item);
    void onSendClicked();
    void onConnected();
    void onDisconnected();
    void onTextMessageReceived(const QString &message);
    void onSocketError(QAbstractSocket::SocketError error);
    void loadConversations();
    void loadMessages();

private:
    void setupUi();
    void setupWebSocket();
    void connectSocket();
    void disconnectSocket();
    void sendMessage(const QString &content, const QString &msgType = "text");
    void appendMessage(const Message &message);
    QString generateConversationId(const QString &targetId, const QString &type);
    
    // 左侧导航
    QPushButton *m_chatBtn;
    QPushButton *m_contactBtn;
    QPushButton *m_settingsBtn;
    
    // 会话列表
    QListWidget *m_conversationList;
    QLabel *m_emptyLabel;
    
    // 聊天区域
    QStackedWidget *m_chatStack;
    QWidget *m_welcomeWidget;
    QWidget *m_messageWidget;
    QLabel *m_chatTitleLabel;
    QTextEdit *m_messageDisplay;
    QLineEdit *m_inputEdit;
    QPushButton *m_sendBtn;
    
    // 联系人
    ContactWidget *m_contactWidget;
    
    // 用户信息
    QLabel *m_userAvatarLabel;
    QLabel *m_userNameLabel;
    QPushButton *m_logoutBtn;
    
    // 数据
    User m_currentUser;
    Conversation m_currentConversation;
    QVector<Conversation> m_conversations;
    QVector<Message> m_messages;
    QWebSocket *m_webSocket;
    QTimer *m_reconnectTimer;
    QString m_wsUrl;
};

#endif // CHATWIDGET_H