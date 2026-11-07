import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import type { PortfolioInput, ServiceInput } from '../validators/catalog.validator';

function parseId(value: string, message: string): number {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new ApiError(404, message);
  return id;
}

export async function listPublicServices(req: Request, res: Response, next: NextFunction) {
  try {
    const services = await prisma.service.findMany({ where: { isVisible: true }, orderBy: { nama: 'asc' } });
    ok(res, services);
  } catch (error) {
    next(error);
  }
}

export async function listAllServices(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, await prisma.service.findMany({ orderBy: { nama: 'asc' } }));
  } catch (error) {
    next(error);
  }
}

export async function createService(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await prisma.service.create({ data: req.body as ServiceInput });
    ok(res, service, 'Jasa ditambahkan.', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateService(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'Jasa tidak ditemukan.');
    const service = await prisma.service.update({ where: { id }, data: req.body as ServiceInput });
    ok(res, service, 'Jasa diperbarui.');
  } catch (error) {
    next(error);
  }
}

// Portofolio milik jasa yang disembunyikan ikut tidak tampil.
export async function listPublicPortfolios(req: Request, res: Response, next: NextFunction) {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { OR: [{ serviceId: null }, { service: { isVisible: true } }] },
      include: { service: { select: { id: true, nama: true } } },
      orderBy: { id: 'desc' },
    });
    ok(res, portfolios);
  } catch (error) {
    next(error);
  }
}

export async function listAllPortfolios(req: Request, res: Response, next: NextFunction) {
  try {
    const portfolios = await prisma.portfolio.findMany({
      include: { service: { select: { id: true, nama: true } } },
      orderBy: { id: 'desc' },
    });
    ok(res, portfolios);
  } catch (error) {
    next(error);
  }
}

export async function createPortfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const portfolio = await prisma.portfolio.create({ data: req.body as PortfolioInput });
    ok(res, portfolio, 'Portofolio ditambahkan.', 201);
  } catch (error) {
    next(error);
  }
}

export async function updatePortfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'Portofolio tidak ditemukan.');
    const portfolio = await prisma.portfolio.update({ where: { id }, data: req.body as PortfolioInput });
    ok(res, portfolio, 'Portofolio diperbarui.');
  } catch (error) {
    next(error);
  }
}

export async function deletePortfolio(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'Portofolio tidak ditemukan.');
    await prisma.portfolio.delete({ where: { id } });
    ok(res, null, 'Portofolio dihapus.');
  } catch (error) {
    next(error);
  }
}
