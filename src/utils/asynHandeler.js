// Promise method
const asyncHandler = (requestHandeler) => {
    (req, res, next) => {
        Promise.resolve(requestHandeler(req, res, next))
        .catch((err) => next(err))
    }
}



export {asyncHandler}


//TryCatch MEthod
// const asyncHandler = (fn) => async(req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(err.code || 500).json({
//             sucess : false,
//             message : err.message
//         })
//     }
// }