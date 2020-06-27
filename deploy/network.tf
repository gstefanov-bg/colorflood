resource "aws_internet_gateway" "kaas-igw" {
    vpc_id = aws_vpc.kaas-vpc.id

    tags = {
        Name = "kaas-igw"
    }
}

resource "aws_route_table" "kaas-public-rt" {
    vpc_id = aws_vpc.kaas-vpc.id

    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.kaas-igw.id
    }

    tags = {
        Name = "kaas-public-rt"
    }
}

resource "aws_route_table_association" "kaas-rta-public-subnet-1"{
    subnet_id = aws_subnet.kaas-subnet-public-1.id
    route_table_id = aws_route_table.kaas-public-rt.id
}

resource "aws_security_group" "ssh-allowed" {
    vpc_id = aws_vpc.kaas-vpc.id

    egress {
        from_port = 0
        to_port = 0
        protocol = -1
        cidr_blocks = ["0.0.0.0/0"]
    }

	ingress {
        from_port = 22
        to_port = 22
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"] # for all Internet
    }

	tags = {
        Name = "ssh-allowed"
    }
}

resource "aws_security_group" "tcp-allowed" {
    vpc_id = aws_vpc.kaas-vpc.id

    egress {
        from_port = 0
        to_port = 0
        protocol = -1
        cidr_blocks = ["0.0.0.0/0"]
    }

	ingress {
        from_port = 3000
        to_port = 3000
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"] # for all Internet
    }

	tags = {
        Name = "tcp-allowed"
    }
}
