#ifndef MODELS_H
#define MODELS_H

#include <QString>
#include <QJsonObject>
#include <QDateTime>
#include <QVector>

// 用户信息
struct User {
    QString id;
    QString username;
    QString nickname;
    QString avatar;
    QString signature;
    QString status;
    
    static User fromJson(const QJsonObject &json) {
        User user;
        user.id = json["id"].toString();
        user.username = json["username"].toString();
        user.nickname = json["nickname"].toString();
        user.avatar = json["avatar"].toString();
        user.signature = json["signature"].toString();
        user.status = json["status"].toString();
        return user;
    }
    
    QJsonObject toJson() const {
        QJsonObject json;
        json["id"] = id;
        json["username"] = username;
        json["nickname"] = nickname;
        json["avatar"] = avatar;
        json["signature"] = signature;
        json["status"] = status;
        return json;
    }
};

// 好友关系
struct Friendship {
    QString id;
    QString friendId;
    QString nickname;
    QString avatar;
    QString signature;
    QString status;
    QString remark;
    
    static Friendship fromJson(const QJsonObject &json) {
        Friendship f;
        f.id = json["id"].toString();
        f.friendId = json["friendId"].toString();
        f.nickname = json["nickname"].toString();
        f.avatar = json["avatar"].toString();
        f.signature = json["signature"].toString();
        f.status = json["status"].toString();
        f.remark = json["remark"].toString();
        return f;
    }
};

// 群组
struct Group {
    QString id;
    QString name;
    QString avatar;
    QString announcement;
    int memberCount;
    QString myRole;
    
    static Group fromJson(const QJsonObject &json) {
        Group g;
        g.id = json["id"].toString();
        g.name = json["name"].toString();
        g.avatar = json["avatar"].toString();
        g.announcement = json["announcement"].toString();
        g.memberCount = json["memberCount"].toInt();
        g.myRole = json["myRole"].toString();
        return g;
    }
};

// 会话
struct Conversation {
    QString id;
    QString type; // private, group
    QString targetId;
    QString targetName;
    QString targetAvatar;
    int unreadCount;
    
    static Conversation fromJson(const QJsonObject &json) {
        Conversation c;
        c.id = json["id"].toString();
        c.type = json["type"].toString();
        c.unreadCount = json["unreadCount"].toInt();
        
        auto target = json["target"].toObject();
        c.targetId = target["id"].toString();
        c.targetName = target["nickname"].toString();
        c.targetAvatar = target["avatar"].toString();
        
        return c;
    }
};

// 消息
struct Message {
    QString id;
    QString conversationId;
    QString conversationType;
    QString senderId;
    QString content;
    QString msgType; // text, image, file
    QString fileId;
    QDateTime createdAt;
    
    // 发送者信息
    QString senderNickname;
    QString senderAvatar;
    
    static Message fromJson(const QJsonObject &json) {
        Message m;
        m.id = json["id"].toString();
        m.conversationId = json["conversationId"].toString();
        m.conversationType = json["conversationType"].toString();
        m.senderId = json["senderId"].toString();
        m.content = json["content"].toString();
        m.msgType = json["msgType"].toString();
        m.fileId = json["fileId"].toString();
        m.createdAt = QDateTime::fromString(json["createdAt"].toString(), Qt::ISODate);
        
        auto sender = json["sender"].toObject();
        m.senderNickname = sender["nickname"].toString();
        m.senderAvatar = sender["avatar"].toString();
        
        return m;
    }
};

// 好友申请
struct FriendRequest {
    QString id;
    User from;
    QString message;
    QDateTime createdAt;
    
    static FriendRequest fromJson(const QJsonObject &json) {
        FriendRequest r;
        r.id = json["id"].toString();
        r.from = User::fromJson(json["from"].toObject());
        r.message = json["message"].toString();
        r.createdAt = QDateTime::fromString(json["createdAt"].toString(), Qt::ISODate);
        return r;
    }
};

#endif // MODELS_H