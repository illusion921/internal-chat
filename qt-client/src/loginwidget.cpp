#include "loginwidget.h"
#include "api/apiclient.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QSettings>
#include <QMessageBox>
#include <QDialog>
#include <QDialogButtonBox>
#include <QGroupBox>

LoginWidget::LoginWidget(QWidget *parent)
    : QWidget(parent)
    , m_isRegisterMode(false)
{
    setupUi();
    loadSettings();
}

void LoginWidget::setupUi()
{
    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    mainLayout->setSpacing(20);
    mainLayout->setContentsMargins(40, 40, 40, 40);
    
    // 标题
    QLabel *titleLabel = new QLabel("内网聊天", this);
    titleLabel->setObjectName("titleLabel");
    titleLabel->setAlignment(Qt::AlignCenter);
    QFont titleFont = titleLabel->font();
    titleFont.setPointSize(24);
    titleFont.setBold(true);
    titleLabel->setFont(titleFont);
    
    QLabel *subtitleLabel = new QLabel("企业级即时通讯解决方案", this);
    subtitleLabel->setObjectName("subtitleLabel");
    subtitleLabel->setAlignment(Qt::AlignCenter);
    subtitleLabel->setStyleSheet("color: #666;");
    
    mainLayout->addWidget(titleLabel);
    mainLayout->addWidget(subtitleLabel);
    mainLayout->addSpacing(20);
    
    // 登录表单
    QGroupBox *formGroup = new QGroupBox(this);
    formGroup->setStyleSheet("QGroupBox { border: 1px solid #ddd; border-radius: 8px; margin-top: 10px; padding-top: 10px; }"
                             "QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 5px; }");
    
    QVBoxLayout *formLayout = new QVBoxLayout(formGroup);
    formLayout->setSpacing(15);
    
    // 服务器地址
    QHBoxLayout *serverLayout = new QHBoxLayout();
    QLabel *serverLabel = new QLabel("服务器:", this);
    serverLabel->setFixedWidth(60);
    m_serverEdit = new QLineEdit(this);
    m_serverEdit->setPlaceholderText("http://192.168.1.39:3002");
    m_settingsBtn = new QPushButton("...", this);
    m_settingsBtn->setFixedSize(30, 30);
    m_settingsBtn->setToolTip("设置");
    connect(m_settingsBtn, &QPushButton::clicked, this, &LoginWidget::onSettingsClicked);
    serverLayout->addWidget(serverLabel);
    serverLayout->addWidget(m_serverEdit);
    serverLayout->addWidget(m_settingsBtn);
    formLayout->addLayout(serverLayout);
    
    // 用户名
    QHBoxLayout *usernameLayout = new QHBoxLayout();
    QLabel *usernameLabel = new QLabel("用户名:", this);
    usernameLabel->setFixedWidth(60);
    m_usernameEdit = new QLineEdit(this);
    m_usernameEdit->setPlaceholderText("请输入用户名");
    usernameLayout->addWidget(usernameLabel);
    usernameLayout->addWidget(m_usernameEdit);
    formLayout->addLayout(usernameLayout);
    
    // 密码
    QHBoxLayout *passwordLayout = new QHBoxLayout();
    QLabel *passwordLabel = new QLabel("密码:", this);
    passwordLabel->setFixedWidth(60);
    m_passwordEdit = new QLineEdit(this);
    m_passwordEdit->setPlaceholderText("请输入密码");
    m_passwordEdit->setEchoMode(QLineEdit::Password);
    passwordLayout->addWidget(passwordLabel);
    passwordLayout->addWidget(m_passwordEdit);
    formLayout->addLayout(passwordLayout);
    
    // 昵称（注册时显示）
    QHBoxLayout *nicknameLayout = new QHBoxLayout();
    QLabel *nicknameLabel = new QLabel("昵称:", this);
    nicknameLabel->setFixedWidth(60);
    m_nicknameEdit = new QLineEdit(this);
    m_nicknameEdit->setPlaceholderText("请输入昵称（可选）");
    nicknameLabel->hide();
    m_nicknameEdit->hide();
    nicknameLayout->addWidget(nicknameLabel);
    nicknameLayout->addWidget(m_nicknameEdit);
    formLayout->addLayout(nicknameLayout);
    
    // 记住密码
    m_rememberCheck = new QCheckBox("记住用户名", this);
    formLayout->addWidget(m_rememberCheck);
    
    mainLayout->addWidget(formGroup);
    mainLayout->addSpacing(10);
    
    // 按钮
    QHBoxLayout *btnLayout = new QHBoxLayout();
    btnLayout->setSpacing(10);
    
    m_loginBtn = new QPushButton("登录", this);
    m_loginBtn->setObjectName("primaryButton");
    m_loginBtn->setFixedHeight(40);
    m_loginBtn->setCursor(Qt::PointingHandCursor);
    
    m_registerBtn = new QPushButton("注册", this);
    m_registerBtn->setObjectName("secondaryButton");
    m_registerBtn->setFixedHeight(40);
    m_registerBtn->setCursor(Qt::PointingHandCursor);
    
    btnLayout->addWidget(m_loginBtn);
    btnLayout->addWidget(m_registerBtn);
    mainLayout->addLayout(btnLayout);
    
    mainLayout->addStretch();
    
    // 连接信号
    connect(m_loginBtn, &QPushButton::clicked, this, &LoginWidget::onLoginClicked);
    connect(m_registerBtn, &QPushButton::clicked, this, &LoginWidget::onRegisterClicked);
    
    // 回车登录
    connect(m_passwordEdit, &QLineEdit::returnPressed, this, &LoginWidget::onLoginClicked);
}

void LoginWidget::loadSettings()
{
    QSettings settings("InternalChat", "InternalChat");
    m_serverEdit->setText(settings.value("server/url", "http://192.168.1.39:3002/api").toString());
    m_usernameEdit->setText(settings.value("login/username").toString());
    m_rememberCheck->setChecked(settings.value("login/remember", true).toBool());
}

void LoginWidget::saveSettings()
{
    QSettings settings("InternalChat", "InternalChat");
    settings.setValue("server/url", m_serverEdit->text().endsWith("/api") ? m_serverEdit->text() : m_serverEdit->text() + "/api");
    
    if (m_rememberCheck->isChecked()) {
        settings.setValue("login/username", m_usernameEdit->text());
        settings.setValue("login/remember", true);
    } else {
        settings.remove("login/username");
        settings.setValue("login/remember", false);
    }
}

void LoginWidget::onLoginClicked()
{
    QString server = m_serverEdit->text().trimmed();
    QString username = m_usernameEdit->text().trimmed();
    QString password = m_passwordEdit->text();
    
    if (server.isEmpty() || username.isEmpty() || password.isEmpty()) {
        QMessageBox::warning(this, "提示", "请填写完整信息");
        return;
    }
    
    // 设置服务器地址
    ApiClient::instance()->setBaseUrl(server);
    
    // 禁用按钮
    m_loginBtn->setEnabled(false);
    m_loginBtn->setText("登录中...");
    
    // 发起登录请求
    ApiClient::instance()->login(username, password, [this](bool success, const QJsonObject &data) {
        m_loginBtn->setEnabled(true);
        m_loginBtn->setText("登录");
        
        if (success) {
            saveSettings();
            User user = User::fromJson(data["user"].toObject());
            emit loginSuccess(user);
        } else {
            QString msg = data["message"].toString();
            if (msg.isEmpty()) msg = "登录失败，请检查网络连接";
            QMessageBox::warning(this, "登录失败", msg);
        }
    });
}

void LoginWidget::onRegisterClicked()
{
    QString server = m_serverEdit->text().trimmed();
    QString username = m_usernameEdit->text().trimmed();
    QString password = m_passwordEdit->text();
    
    if (server.isEmpty() || username.isEmpty() || password.isEmpty()) {
        QMessageBox::warning(this, "提示", "请填写完整信息");
        return;
    }
    
    if (username.length() < 3 || username.length() > 20) {
        QMessageBox::warning(this, "提示", "用户名长度需要 3-20 个字符");
        return;
    }
    
    if (password.length() < 6) {
        QMessageBox::warning(this, "提示", "密码长度至少 6 个字符");
        return;
    }
    
    // 设置服务器地址
    ApiClient::instance()->setBaseUrl(server);
    
    // 禁用按钮
    m_registerBtn->setEnabled(false);
    m_registerBtn->setText("注册中...");
    
    QString nickname = m_nicknameEdit->text().trimmed();
    if (nickname.isEmpty()) nickname = username;
    
    // 发起注册请求
    ApiClient::instance()->registerUser(username, password, nickname, [this](bool success, const QJsonObject &data) {
        m_registerBtn->setEnabled(true);
        m_registerBtn->setText("注册");
        
        if (success) {
            QMessageBox::information(this, "注册成功", "注册成功，请登录");
        } else {
            QString msg = data["message"].toString();
            if (msg.isEmpty()) msg = "注册失败";
            QMessageBox::warning(this, "注册失败", msg);
        }
    });
}

void LoginWidget::onSettingsClicked()
{
    QDialog dialog(this);
    dialog.setWindowTitle("服务器设置");
    dialog.setModal(true);
    
    QVBoxLayout *layout = new QVBoxLayout(&dialog);
    
    QFormLayout *formLayout = new QFormLayout();
    QLineEdit *urlEdit = new QLineEdit(m_serverEdit->text(), &dialog);
    urlEdit->setPlaceholderText("http://192.168.1.39:3002");
    formLayout->addRow("服务器地址:", urlEdit);
    layout->addLayout(formLayout);
    
    QDialogButtonBox *buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, &dialog);
    connect(buttons, &QDialogButtonBox::accepted, &dialog, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, &dialog, &QDialog::reject);
    layout->addWidget(buttons);
    
    if (dialog.exec() == QDialog::Accepted) {
        QString url = urlEdit->text().trimmed();
        if (!url.isEmpty()) {
            m_serverEdit->setText(url);
        }
    }
}