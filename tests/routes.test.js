const request = require('supertest')
const app = require('../src/app')

describe('Get Endpoints', () => {
    it('should return 401 if profile_id header is not set', async () => {
        const res = await request(app)
            .get('/contracts/1')
        expect(res.statusCode).toEqual(401)
    })
})
