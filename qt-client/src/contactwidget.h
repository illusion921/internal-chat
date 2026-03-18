#ifndef CONTACTWIDGET_H
#define CONTACTWIDGET_H

#include <QWidget>
#include <QTabWidget>
#include <QListWidget>
#include "models/models.h"

class ContactWidget : public QWidget
{
    Q_OBJECT

public:
    explicit ContactWidget(QWidget *parent = nullptr);
    
signals:
    void conversationSelected(const QString &id, const QString &type, const QString &name);

private slots:
    void loadFriends();
    void loadGroups();
    void onFriendClicked(QListWidgetItem *item);
    void onGroupClicked(QListWidgetItem *item);

private:
    void setupUi();
    
    QTabWidget *m_tabWidget;
    QListWidget *m_friendList;
    QListWidget *m_groupList;
    
    QVector<Friendship> m_friends;
    QVector<Group> m_groups;
};

#endif // CONTACTWIDGET_H