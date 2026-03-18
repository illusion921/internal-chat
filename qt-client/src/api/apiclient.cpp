#include "apiclient.h"
#include "../models/models.h"
#include <QJsonDocument>
#include <QNetworkRequest>
#include <QHttpMultiPart>
#include <QFile>

ApiClient* ApiClient::m_instance = nullptr;

ApiClient* ApiClient::instance()
{
    if (!m_instance) {
        m_instance = new ApiClient();
    }
    return m_instance;
}

ApiClient::ApiClient(QObject *parent)
    : QObject(parent)
    , m_manager(new QNetworkAccessManager(this))
    , m_baseUrl("http://localhost:3002/api")
{
}

ApiClient::~ApiClient()
{
}

void ApiClient::setBaseUrl(const QString &url)
{
    m_baseUrl = url;
    if (!m_baseUrl.endsWith("/api")) {
        m_baseUrl += "/api";
    }
}

void ApiClient::setToken(const QString &token)
{
    m_token = token;
}

void ApiClient::setAuthHeader(QNetworkRequest &request)
{
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    if (!m_token.isEmpty()) {
        request.setRawHeader("Authorization", QString("Bearer %1").arg(m_token).toUtf8());
    }
}

QNetworkReply* ApiClient::get(const QString &endpoint)
{
    QNetworkRequest request(QUrl(m_baseUrl + endpoint));
    setAuthHeader(request);
    return m_manager->get(request);
}

QNetworkReply* ApiClient::post(const QString &endpoint, const QJsonObject &data)
{
    QNetworkRequest request(QUrl(m_baseUrl + endpoint));
    setAuthHeader(request);
    return m_manager->post(request, QJsonDocument(data).toJson());
}

QNetworkReply* ApiClient::put(const QString &endpoint, const QJsonObject &data)
{
    QNetworkRequest request(QUrl(m_baseUrl + endpoint));
    setAuthHeader(request);
    return m_manager->put(request, QJsonDocument(data).toJson());
}

QNetworkReply* ApiClient::del(const QString &endpoint)
{
    QNetworkRequest request(QUrl(m_baseUrl + endpoint));
    setAuthHeader(request);
    return m_manager->deleteResource(request);
}

QByteArray ApiClient::handleReply(QNetworkReply *reply, bool &success, QJsonObject &result)
{
    QByteArray data = reply->readAll();
    success = false;
    
    if (reply->error() == QNetworkReply::NoError) {
        QJsonDocument doc = QJsonDocument::fromJson(data);
        if (doc.isObject()) {
            result = doc.object();
            success = result["code"].toInt() == 0;
        }
    } else {
        QJsonDocument doc = QJsonDocument::fromJson(data);
        if (doc.isObject()) {
            result = doc.object();
        }
        result["error"] = reply->errorString();
    }
    
    reply->deleteLater();
    return data;
}

// ==================== 认证 ====================

void ApiClient::login(const QString &username, const QString &password,
                      std::function<void(bool success, const QJsonObject &data)> callback)
{
    QJsonObject data;
    data["username"] = username;
    data["password"] = password;
    
    QNetworkReply *reply = post("/auth/login", data);
    
    connect(reply, &QNetworkReply::finished, this, [this, reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        
        if (success) {
            QJsonObject responseData = result["data"].toObject();
            m_token = responseData["token"].toString();
        }
        
        callback(success, result["data"].toObject());
    });
}

void ApiClient::registerUser(const QString &username, const QString &password,
                             const QString &nickname,
                             std::function<void(bool success, const QJsonObject &data)> callback)
{
    QJsonObject data;
    data["username"] = username;
    data["password"] = password;
    data["nickname"] = nickname;
    
    QNetworkReply *reply = post("/auth/register", data);
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toObject());
    });
}

void ApiClient::logout(std::function<void(bool success)> callback)
{
    QNetworkReply *reply = post("/auth/logout", QJsonObject());
    
    connect(reply, &QNetworkReply::finished, this, [this, reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        
        if (success) {
            m_token.clear();
            emit logoutSuccess();
        }
        
        callback(success);
    });
}

void ApiClient::getMe(std::function<void(bool success, const QJsonObject &data)> callback)
{
    QNetworkReply *reply = get("/auth/me");
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toObject());
    });
}

// ==================== 好友 ====================

void ApiClient::getFriends(std::function<void(bool success, const QJsonArray &data)> callback)
{
    QNetworkReply *reply = get("/friends");
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toArray());
    });
}

void ApiClient::getFriendRequests(std::function<void(bool success, const QJsonArray &data)> callback)
{
    QNetworkReply *reply = get("/friends/requests");
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toArray());
    });
}

void ApiClient::handleFriendRequest(const QString &id, const QString &action,
                                    std::function<void(bool success)> callback)
{
    QJsonObject data;
    data["action"] = action;
    
    QNetworkReply *reply = put(QString("/friends/request/%1").arg(id), data);
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success);
    });
}

void ApiClient::deleteFriend(const QString &id, std::function<void(bool success)> callback)
{
    QNetworkReply *reply = del(QString("/friends/%1").arg(id));
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success);
    });
}

void ApiClient::searchUser(const QString &keyword,
                           std::function<void(bool success, const QJsonArray &data)> callback)
{
    QNetworkReply *reply = get(QString("/users/search?keyword=%1").arg(keyword));
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toObject()["list"].toArray());
    });
}

void ApiClient::addFriend(const QString &userId, const QString &message,
                          std::function<void(bool success)> callback)
{
    QJsonObject data;
    data["friendId"] = userId;
    data["message"] = message;
    
    QNetworkReply *reply = post("/friends/request", data);
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success);
    });
}

// ==================== 群组 ====================

void ApiClient::getGroups(std::function<void(bool success, const QJsonArray &data)> callback)
{
    QNetworkReply *reply = get("/groups");
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toArray());
    });
}

void ApiClient::createGroup(const QString &name, const QStringList &memberIds,
                            std::function<void(bool success, const QJsonObject &data)> callback)
{
    QJsonObject data;
    data["name"] = name;
    QJsonArray members;
    for (const QString &id : memberIds) {
        members.append(id);
    }
    data["memberIds"] = members;
    
    QNetworkReply *reply = post("/groups", data);
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toObject());
    });
}

void ApiClient::getGroupDetail(const QString &groupId,
                               std::function<void(bool success, const QJsonObject &data)> callback)
{
    QNetworkReply *reply = get(QString("/groups/%1").arg(groupId));
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toObject());
    });
}

void ApiClient::deleteGroup(const QString &groupId, std::function<void(bool success)> callback)
{
    QNetworkReply *reply = del(QString("/groups/%1").arg(groupId));
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success);
    });
}

void ApiClient::quitGroup(const QString &groupId, std::function<void(bool success)> callback)
{
    QNetworkReply *reply = post(QString("/groups/%1/quit").arg(groupId), QJsonObject());
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success);
    });
}

// ==================== 消息 ====================

void ApiClient::getConversations(std::function<void(bool success, const QJsonArray &data)> callback)
{
    QNetworkReply *reply = get("/conversations");
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toArray());
    });
}

void ApiClient::getMessages(const QString &conversationId, int page, int pageSize,
                            std::function<void(bool success, const QJsonObject &data)> callback)
{
    QString url = QString("/conversations/%1/messages?page=%2&pageSize=%3")
                  .arg(conversationId).arg(page).arg(pageSize);
    QNetworkReply *reply = get(url);
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toObject());
    });
}

// ==================== 文件 ====================

void ApiClient::uploadFile(const QString &filePath,
                           std::function<void(bool success, const QJsonObject &data)> callback)
{
    QFile *file = new QFile(filePath);
    if (!file->open(QIODevice::ReadOnly)) {
        callback(false, QJsonObject());
        delete file;
        return;
    }
    
    QHttpMultiPart *multiPart = new QHttpMultiPart(QHttpMultiPart::FormDataType);
    
    QHttpPart filePart;
    filePart.setHeader(QNetworkRequest::ContentTypeHeader, "application/octet-stream");
    filePart.setHeader(QNetworkRequest::ContentDispositionHeader, 
                       QString("form-data; name=\"file\"; filename=\"%1\"")
                       .arg(QFileInfo(filePath).fileName()));
    filePart.setBodyDevice(file);
    file->setParent(multiPart);
    multiPart->append(filePart);
    
    QNetworkRequest request(QUrl(m_baseUrl + "/files/upload"));
    setAuthHeader(request);
    
    QNetworkReply *reply = m_manager->post(request, multiPart);
    multiPart->setParent(reply);
    
    connect(reply, &QNetworkReply::finished, this, [reply, callback]() {
        bool success;
        QJsonObject result;
        handleReply(reply, success, result);
        callback(success, result["data"].toObject());
    });
}