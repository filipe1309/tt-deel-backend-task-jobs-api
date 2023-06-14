const request = require('supertest')
const app = require('../src/app')


beforeAll(async () => {
    // await require('../src/model').sequelize.sync()
    jest.setTimeout(10000)
})

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
        // timeout
        jest.setTimeout(10000)
        const res = await request(app)
            .post('/balances/deposit/1')
            .set('profile_id', 1)
            .send({ amount: 50 })
        expect(res.statusCode).toEqual(200)
        expect(res.body.balance).toBe(1000)
    })
})


