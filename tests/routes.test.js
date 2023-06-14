const request = require('supertest')
const app = require('../src/app')

describe('Contracts Endpoints', () => {
    it('should return 401 if profile_id header is not set', async () => {
        const res = await request(app)
            .get('/contracts/1')
        expect(res.statusCode).toEqual(401)
    })

    it('should return a contract by id', async () => {
        const res = await request(app)
            .get('/contracts/1')
            .set('profile_id', 1)
        expect(res.statusCode).toEqual(200)
        expect(res.body).toHaveProperty('ClientId')
    })

    it('should return a list of contracts', async () => {
        const res = await request(app)
            .get('/contracts')
            .set('profile_id', 2)
        expect(res.statusCode).toEqual(200)
        expect(res.body.length).toBeGreaterThan(0)
    })
})

describe('Jobs Endpoints', () => {
    it('should return a list of unpaid jobs', async () => {
        const res = await request(app)
            .get('/jobs/unpaid')
            .set('profile_id', 1)
        expect(res.statusCode).toEqual(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].Contract.status).toBe("in_progress")
    })

    it('should pay for a job', async () => {
        const res = await request(app)
            .post('/jobs/1/pay')
            .set('profile_id', 1)
        expect(res.statusCode).toEqual(200)
        expect(res.body.paid).toBe(true)
    })

    it('should deposit money into the balance of a client', async () => {
        const res = await request(app)
            .post('/balances/deposit/1')
            .set('profile_id', 1)
            .send({ amount: 50 })
        expect(res.statusCode).toEqual(200)
        expect(res.body.balance).toBe(1000)
    })
})

describe('Admin Endpoints', () => {
    it('should return the best profession', async () => {
        const res = await request(app)
            .get('/admin/best-profession?start=2020-08-14T23:11:26.737Z&end=2020-08-17T19:11:26.737Z')
            .set('profile_id', 1)
        expect(res.statusCode).toEqual(200)
        expect(res.body.profession).toBe("Programmer")
        expect(res.body.total).toBe(2683)
    })

    it('should return the best clients', async () => {
        const res = await request(app)
            .get('/admin/best-clients?start=2020-08-14T23:11:26.737Z&end=2020-08-17T19:11:26.737Z&limit=2')
            .set('profile_id', 1)
        expect(res.statusCode).toEqual(200)
        expect(res.body.length).toBe(2)
        expect(res.body[0].fullName).toBe("Ash Kethcum")
        expect(res.body[0].paid).toBe(2020)
    })
});


