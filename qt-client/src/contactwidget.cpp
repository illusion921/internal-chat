#include "contactwidget.h"
#include "api/apiclient.h"
#include <QVBoxLayout>
#include <QHBoxLayout>

ContactWidget::ContactWidget(QWidget *parent)
    : QWidget(parent)
{
    setupUi();
    loadFriends();
    loadGroups();
}

void ContactWidget::setupUi()
{
    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    mainLayout->setSpacing(0);
    mainLayout->setContentsMargins(0, 0, 0, 0);
    
    // 标题栏
    QWidget *headerWidget = new QWidget(this);
    headerWidget->setFixedHeight(50);
    headerWidget->setStyleSheet("background: #fff; border-bottom: 1px solid #e8e8e8;");
    QHBoxLayout *headerLayout = new QHBoxLayout(headerWidget);
    
    QLabel *titleLabel = new QLabel("联系人", headerWidget);
    titleLabel->setStyleSheet("font-size: 15px; font-weight: bold;");
    headerLayout->addWidget(titleLabel);
    headerLayout->addStretch();
    
    mainLayout->addWidget(headerWidget);
    
    // 标签页
    m_tabWidget = new QTabWidget(this);
    m_tabWidget->setStyleSheet("QTabWidget::pane { border: none; background: #fff; }"
                               "QTabBar::tab { background: transparent; padding: 10px 20px; }"
                               "QTabBar::tab:selected { color: #07c160; border-bottom: 2px solid #07c160; }"
                               "QTabBar::tab:hover { color: #07c160; }");
    
    // 好友列表
    QWidget *friendPage = new QWidget();
    QVBoxLayout *friendLayout = new QVBoxLayout(friendPage);
    friendLayout->setContentsMargins(0, 0, 0, 0);
    
    m_friendList = new QListWidget(friendPage);
    m_friendList->setStyleSheet("QListWidget { background: transparent; border: none; }"
                                "QListWidget::item { background: transparent; padding: 10px; border-bottom: 1px solid #f0f0f0; }"
                                "QListWidget::item:hover { background: #f5f5f5; }"
                                "QListWidget::item:selected { background: #e8e8e8; }");
    m_friendList->setVerticalScrollMode(QAbstractItemView::ScrollPerPixel);
    friendLayout->addWidget(m_friendList);
    
    m_tabWidget->addTab(friendPage, "好友");
    
    // 群组列表
    QWidget *groupPage = new QWidget();
    QVBoxLayout *groupLayout = new QVBoxLayout(groupPage);
    groupLayout->setContentsMargins(0, 0, 0, 0);
    
    m_groupList = new QListWidget(groupPage);
    m_groupList->setStyleSheet(m_friendList->styleSheet());
    m_groupList->setVerticalScrollMode(QAbstractItemView::ScrollPerPixel);
    groupLayout->addWidget(m_groupList);
    
    m_tabWidget->addTab(groupPage, "群组");
    
    mainLayout->addWidget(m_tabWidget);
    
    // 连接信号
    connect(m_friendList, &QListWidget::itemClicked, this, &ContactWidget::onFriendClicked);
    connect(m_groupList, &QListWidget::itemClicked, this, &ContactWidget::onGroupClicked);
}

void ContactWidget::loadFriends()
{
    ApiClient::instance()->getFriends([this](bool success, const QJsonArray &data) {
        if (success) {
            m_friends.clear();
            m_friendList->clear();
            
            for (const QJsonValue &val : data) {
                Friendship f = Friendship::fromJson(val.toObject());
                m_friends.append(f);
                
                QListWidgetItem *item = new QListWidgetItem();
                item->setText(f.remark.isEmpty() ? f.nickname : f.remark);
                item->setData(Qt::UserRole, f.friendId);
                item->setToolTip(QString("%1 (%2)").arg(f.nickname).arg(f.status));
                
                if (f.status == "online") {
                    item->setForeground(QColor("#07c160"));
                }
                
                m_friendList->addItem(item);
            }
        }
    });
}

void ContactWidget::loadGroups()
{
    ApiClient::instance()->getGroups([this](bool success, const QJsonArray &data) {
        if (success) {
            m_groups.clear();
            m_groupList->clear();
            
            for (const QJsonValue &val : data) {
                Group g = Group::fromJson(val.toObject());
                m_groups.append(g);
                
                QListWidgetItem *item = new QListWidgetItem();
                item->setText(QString("%1 (%2人)").arg(g.name).arg(g.memberCount));
                item->setData(Qt::UserRole, g.id);
                
                m_groupList->addItem(item);
            }
        }
    });
}

void ContactWidget::onFriendClicked(QListWidgetItem *item)
{
    QString friendId = item->data(Qt::UserRole).toString();
    QString name = item->text();
    emit conversationSelected(friendId, "private", name);
}

void ContactWidget::onGroupClicked(QListWidgetItem *item)
{
    QString groupId = item->data(Qt::UserRole).toString();
    QString name = item->text().split(" (").first();
    emit conversationSelected(groupId, "group", name);
}