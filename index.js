var dust = require('dust')();
var serand = require('serand');
var utils = require('utils');
var captcha = require('captcha');
var form = require('form');

dust.loadSource(dust.compile(require('./template'), 'accounts-recover'));

var configs = {
    email: {
        find: function (context, source, done) {
            done(null, $('input', source).val());
        },
        validate: function (context, data, value, done) {
            if (!value) {
                return done(null, 'Please enter your email');
            }
            if (!is.email(value)) {
                return done(null, 'Please enter a valid email address');
            }
            done(null, null, value);
        },
        update: function (context, source, error, value, done) {
            $('input', source).val(value);
            done()
        }
    }
};

module.exports = function (ctx, container, options, done) {
    var sandbox = container.sandbox;
    var captchaId;

    dust.render('accounts-recover', {
        _: {
            container: container.id
        }
    }, function (err, out) {
        if (err) {
            return done(err);
        }
        var elem = sandbox.append(out);
        var lform = form.create(container.id, elem, configs);
        lform.render(ctx, {}, function (err) {
            if (err) {
                return done(err);
            }
            var recover = $('.recover', elem);
            sandbox.on('click', '.recover', function (e) {
                lform.find(function (err, data) {
                    if (err) {
                        return console.error(err);
                    }
                    lform.validate(data, function (err, errors, data) {
                        if (err) {
                            return console.error(err);
                        }
                        if (errors) {
                            lform.update(errors, data, function (err) {
                                if (err) {
                                    return console.error(err);
                                }
                                recover.removeAttr('disabled');
                            });
                            return;
                        }
                        lform.update(errors, data, function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            lform.create(data, function (err, errors, data) {
                                if (err) {
                                    return console.error(err);
                                }
                                if (errors) {
                                    lform.update(errors, data, function (err) {
                                        if (err) {
                                            return console.error(err);
                                        }
                                        recover.removeAttr('disabled');
                                    });
                                    return;
                                }
                                captcha.response(captchaId, function (err, xcaptcha) {
                                    if (err) {
                                        return console.error(err);
                                    }
                                    if (!xcaptcha) {
                                        return;
                                    }
                                    recovery(captcha, captchaId, xcaptcha, data.email, options, function (err) {
                                        if (err) {
                                            return console.error(err);
                                        }
                                        serand.redirect('/recovered?email=' + data.email);
                                    });
                                });
                            });
                        });
                    });
                });
                return false;
            });
            done(null, {
                clean: function () {

                },
                ready: function () {
                    captcha.render($('.captcha', sandbox), {
                        success: function () {
                            $('.recover', sandbox).removeAttr('disabled');
                        }
                    }, function (err, id) {
                        if (err) {
                            return console.error(err);
                        }
                        captchaId = id;
                    });
                }
            });
        });
    });
};

var recovery = function (captcha, captchaId, xcaptcha, email, options, done) {
    $.ajax({
        method: 'POST',
        url: utils.resolve('accounts:///apis/v/users'),
        data: JSON.stringify({
            query: {
                email: email
            }
        }),
        headers: {
            'X-Action': 'recover',
            'X-Captcha': xcaptcha
        },
        contentType: 'application/json',
        dataType: 'json',
        success: function () {
            done();
        },
        error: function (xhr, status, err) {
            captcha.reset(captchaId, function () {
                err = err || status || xhr;
                done(err);
            });
        }
    });
};
