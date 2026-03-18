#ifndef APICLIENT_H
#define APICLIENT_H

#include <QObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QJsonObject>
#include <QJsonArray>
#include <functional>

class ApiClient : public QObject
{
    Q_OBJECT

public:
    static ApiClient* instance();
    
    void setBaseUrl(const QString &url);
    QString baseUrl() const { return m_baseUrl; }
    
    void setToken(const QString &token);
    QString token() const { return m_token; }
    
    // 认证
    void login(const QString &username, const QString &password,
               std::function<void(bool success, const QJsonObject &data)> callback);
    void registerUser(const QString &username, const QString &password, const QString &nickname,
                      std::function<void(bool success, const QJsonObject &data)> callback);
    void logout(std::function<void(bool success)> callback);
    void getMe(std::function<void(bool success, const QJsonObject &data)> callback);
    
    // 好友
    void getFriends(std::function<void(bool success, const QJsonArray &data)> callback);
    void getFriendRequests(std::function<void(bool success, const QJsonArray &data)> callback);
    void handleFriendRequest(const QString &id, const QString &action,
                             std::function<void(bool success)> callback);
    void deleteFriend(const QString &id, std::function<void(bool success)> callback);
    void searchUser(const QString &keyword,
                    std::function<void(bool success, const QJsonArray &data)> callback);
    void addFriend(const QString &userId, const QString &message,
                   std::function<void(bool success)> callback);
    
    // 群组
    void getGroups(std::function<void(bool success, const QJsonArray &data)> callback);
    void createGroup(const QString &name, const QStringList &memberIds,
                     std::function<void(bool success, const QJsonObject &data)> callback);
    void getGroupDetail(const QString &groupId,
                        std::function<void(bool success, const QJsonObject &data)> callback);
    void deleteGroup(const QString &groupId, std::function<void(bool success)> callback);
    void quitGroup(const QString &groupId, std::function<void(bool success)> callback);
    
    // 消息
    void getConversations(std::function<void(bool success, const QJsonArray &data)> callback);
    void getMessages(const QString &conversationId, int page, int pageSize,
                     std::function<void(bool success, const QJsonObject &data)> callback);
    
    // 文件
    void uploadFile(const QString &filePath,
                    std::function<void(bool success, const QJsonObject &data)> callback);
    
signals:
    void loginSuccess(const User &user);
    void logoutSuccess();
    void error(const QString &message);
    
private:
    explicit ApiClient(QObject *parent = nullptr);
    ~ApiClient();
    
    QNetworkReply* get(const QString &endpoint);
    QNetworkReply* post(const QString &endpoint, const QJsonObject &data);
    QNetworkReply* put(const QString &endpoint, const QJsonObject &data);
    QNetworkReply* del(const QString &endpoint);
    
    void setAuthHeader(QNetworkRequest &request);
    QByteArray handleReply(QNetworkReply *reply, bool &success, QJsonObject &result);
    
    static ApiClient *m_instance;
    QNetworkAccessManager *m_manager;
    QString m_baseUrl;
    QString m_token;
};

#endif // APICLIENT_H