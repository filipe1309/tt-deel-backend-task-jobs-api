const request = require('supertest')
const app = require('../src/app')

describe('Get Endpoints', () => {
    it('should return 401 if profile_id header is not set', async () => {
        const res = await request(app)
            .get('/contracts/1')
        expect(res.statusCode).toEqual(401)
    })


    it('should return a contract by id', async () => {
        const res = await request(app)
            .get('/contracts/2')
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


