const supertest = require("supertest");
const { connect, disconnect } = require("../src/database");

/* ВАЖНО: для работы тестов я использовал данные из ващего же файла с тестовыми данными ../source/data.json. Для того,
    чтобы тесты проходили эти данные автоматически вставляются в тестовую БД. Не меняйте их таким образом, чтобы поломать тесты. */
const TEST_CREDENTIALS = "am9lQHNtaXRoLmNvbTpwYXNzd29yZA=="; // joe@smith.com:password
const TEST_REVIEWER_CREDENTIALS = "c2FtQGpvbmVzLmNvbTpwYXNzd29yZA=="; // sam@jones.com:password
const TEST_EMAIL = "joe@smith.com";
const TEST_COURSE_ID = "57029ed4795118be119cc43d";

/* В этом файле я привел автоматизированную версию всех запросов, которые вы прописали в файле CourseAPI.postman_collection.json,
    если хотите, то для теста можете использовать и то и другое */
describe("Express API", () => {
    let request = null;

    /* Прежде чем запустятся все тесты устанавливается подключение к тестовой БД, в нее сидятся данные, запускается Express
        приложение на 8001 порту и передается в качестве точки входа пакету supertes, который и осуществляет запросы к
        методам API */
    before(function(done) {
        this.timeout(10000);
        connect({ NODE_ENV: "test" }).then(() => {
            app.listen(8001);
            request = supertest(app);
            done();
        }).catch(err => done(err));
    });

    describe("GET /api/users", () => {
        it("должен работать только для авторизованных пользователей", done => {
            request.get("/api/users")
                .expect(401)
                .then(() => done())
                .catch(err => done(err));
        });
        it("для авторизованного пользователя должен возвращать его документ из базы данных", done => {
            request.get("/api/users")
                .set("Authorization", `Basic ${TEST_CREDENTIALS}`)
                .expect(200)
                .then(res => {
                    expect(res.body)
                        .to.have.property("emailAddress").with
                        .to.be.equal(TEST_EMAIL);
                    done();
                })
                .catch(err => done(err));
        });
    });

    describe("POST /api/users", () => {
        it("должен возвращать статус ответа 201 и заголовок Location в значении '/'", done => {
            request.post("/api/users")
                .send({ fullName: "John Smith", emailAddress: "john@smith.com", password: "password", confirmPassword: "password" })
                .set("Content-Type", "application/json")
                .expect(201)
                .expect("Location", "/")
                .then(() => done())
                .catch(err => done(err));
        });
        it("должен вернуть ошибку 400 при передаче не заполненной модели пользователя", done => {
            request.post("/api/users")
                .set("Content-Type", "application/json")
                .expect(400)
                .then(() => done())
                .catch(err => done(err));
        });
        it("должен вернуть ошибку при попытке сохранить пользователя с уже существующим в базе данных email", done => {
            request.post("/api/users")
                .send({ fullName: "Joe Smith", emailAddress: "joe@smith.com", password: "password", confirmPassword: "password" })
                .set("Content-Type", "application/json")
                .expect(400)
                .then(res => {
                    expect(res.body)
                        .to.have.property("success").with
                        .to.be.equal(false);
                    expect(res.body)
                        .to.have.property("code").with
                        .to.be.equal(11000);
                    done();
                })
                .catch(err => done(err));
        });
    });

    describe("GET /api/courses", () => {
        it("должен вернуть список всех курсов со свойствами _id и title", done => {
            request.get("/api/courses")
                .expect(200)
                .then(res => {
                    expect(res.body).to.be.a("array");
                    expect(res.body).to.be.have.lengthOf(2);
                    res.body.forEach(item => {
                        expect(item).to.have.property("_id");
                        expect(item).to.have.property("title");
                    });
                    done();
                })
                .catch(err => done(err));
        });
    });

    describe("GET /api/course/:id", () => {
        it("Должен вернуть ошибку, если в запрос передать не верный ИД", done => {
            request.get(`/api/course/007`)
                .expect(400)
                .then(() => done())
                .catch(err => done(err));
        });
        it("Должен вернуть один курс, его пользователя и обзоры по переданному ИД", done => {
            request.get(`/api/course/${TEST_COURSE_ID}`)
                .expect(200)
                .then(res => {
                    expect(res.body)
                        .to.have.property("_id").with
                        .to.be.equal(TEST_COURSE_ID);
                    done();
                })
                .catch(err => done(err));
        });
    });

    describe("POST /api/courses", () => {
        it("должен работать только для авторизоавнных пользователей", done => {
            request.post("/api/courses")
                .expect(401)
                .then(() => done())
                .catch(err => done(err));
        });
        it("должен возвращать статус ответа 201 и заголовок Location в значении '/course/:id'", done => {
            request.post("/api/courses")
                .set("Authorization", `Basic ${TEST_CREDENTIALS}`)
                .send({ title: "New Course", description: "My course description", user: { _id:  "57029ed4795118be119cc437" }, steps: [ { title: "Step 1", description: "My first step." } ] })
                .set("Content-Type", "application/json")
                .expect(201)
                .then(res => {
                    expect(res.headers.location)
                        .to.match(/\/course\/\w+/gi);
                    done();
                })
                .catch(err => done(err));
        });
        it("должен вернуть ошибку 400 при передаче не заполненной модели пользователя", done => {
            request.post("/api/courses")
                .set("Authorization", `Basic ${TEST_CREDENTIALS}`)
                .set("Content-Type", "application/json")
                .expect(400)
                .then(() => done())
                .catch(err => done(err));
        });
    });

    describe("PUT /api/courses/:id", () => {
        it("должен работать только для авторизоавнных пользователей", done => {
            request.put(`/api/courses/${TEST_COURSE_ID}`)
                .expect(401)
                .then(() => done())
                .catch(err => done(err));
        });
        it("должен вернуть ошибку, если в запрос передать не верный ИД", done => {
            request.put(`/api/courses/007`)
                .set("Authorization", `Basic ${TEST_CREDENTIALS}`)
                .send({ _id: TEST_COURSE_ID, title: "New Course Updated Again Hello", description: "My course description. And again.", user: { _id:  "57029ed4795118be119cc437" }, steps: [ { title: "Step 1", description: "My first step." } ] })
                .set("Content-Type", "application/json")
                .expect(400)
                .then(() => done())
                .catch(err => done(err));
        });
        it("должен возвращать статус ответа 204 при успешном завершении работы", done => {
            request.put(`/api/courses/${TEST_COURSE_ID}`)
                .set("Authorization", `Basic ${TEST_CREDENTIALS}`)
                .send({ _id: TEST_COURSE_ID, title: "New Course Updated Again Hello", description: "My course description. And again.", user: { _id:  "57029ed4795118be119cc437" }, steps: [ { title: "Step 1", description: "My first step." } ] })
                .set("Content-Type", "application/json")
                .expect(204)
                .then(res => done())
                .catch(err => done(err));
        });
    });

    describe("POST /api/courses/:id/reviews", () => {
        it("должен работать только для авторизоавнных пользователей", done => {
            request.post(`/api/courses/${TEST_COURSE_ID}/reviews`)
                .expect(401)
                .then(() => done())
                .catch(err => done(err));
        });
        it("должен вернуть ошибку, если в запрос передать не верный ИД", done => {
            request.post(`/api/courses/007/reviews`)
                .set("Authorization", `Basic ${TEST_REVIEWER_CREDENTIALS}`)
                .send({ rating: 2 })
                .set("Content-Type", "application/json")
                .expect(400)
                .then(() => done())
                .catch(err => done(err));
        });
        it("должен возвращать статус ответа 201 и заголовок Location в значении '/course/:id'", done => {
            request.post(`/api/courses/${TEST_COURSE_ID}/reviews`)
                .set("Authorization", `Basic ${TEST_REVIEWER_CREDENTIALS}`)
                .send({ rating: 2 })
                .set("Content-Type", "application/json")
                .expect(201)
                .then(res => {
                    expect(res.headers.location)
                        .to.match(/\/course\/\w+/gi);
                    done();
                })
                .catch(err => done(err));
        });
        it("должен возвращать ошибку при попытке оставить отзыв под своим курсом", done => {
            request.post(`/api/courses/${TEST_COURSE_ID}/reviews`)
            .set("Authorization", `Basic ${TEST_CREDENTIALS}`)
            .send({ rating: 2 })
            .set("Content-Type", "application/json")
            .expect(400)
            .then(res => done())
            .catch(err => done(err));
        });
    });

    after(function(done) {
        disconnect().then(done).catch(done);
    });
});